package service

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

var ErrVerificationUnavailable = errors.New("ระบบตรวจสลิปอัตโนมัติยังไม่พร้อม")

// SlipVerification is deliberately an assessment of the image, not a claim that
// money reached the recipient account. A payment-provider webhook is still needed
// before this can be treated as financial settlement.
type SlipVerification struct {
	Status       string `json:"status"` // pass, suspicious, reject
	Score        int    `json:"score"`  // 0-100 risk score; higher is riskier
	Reason       string `json:"reason"`
	AmountSatang *int   `json:"amount_satang,omitempty"`
	Reference    string `json:"reference,omitempty"`
	CheckedAt    string `json:"checked_at"`
}

type SlipAI struct {
	APIKey   string
	Model    string
	Endpoint string
	Client   *http.Client
}

func (a *SlipAI) Verify(ctx context.Context, image []byte, mime string, expectedSatang int) (SlipVerification, error) {
	if a == nil || strings.TrimSpace(a.APIKey) == "" {
		return SlipVerification{}, ErrVerificationUnavailable
	}
	model := a.Model
	if model == "" {
		model = "gpt-4o"
	}
	endpoint := a.Endpoint
	if endpoint == "" {
		endpoint = "https://api.openai.com/v1/responses"
	}
	client := a.Client
	if client == nil {
		client = &http.Client{Timeout: 25 * time.Second}
	}
	prompt := fmt.Sprintf(`Analyze this Thai bank-transfer slip as image evidence for one booking only. Expected amount is %d satang. Extract only information visibly supported by the image. Do not claim funds reached any bank account. Classify as pass only when this visibly appears to be a coherent transfer slip, the amount is exactly the expected amount, and there are no visible manipulation or reuse indicators. Classify suspicious for unreadable/ambiguous evidence or possible manipulation. Classify reject if it is clearly not a transfer slip, shows a different amount, or has clear manipulation. Return Thai reason concise.`, expectedSatang)
	schema := map[string]any{
		"type": "object", "additionalProperties": false,
		"properties": map[string]any{
			"status":        map[string]any{"type": "string", "enum": []string{"pass", "suspicious", "reject"}},
			"score":         map[string]any{"type": "integer", "minimum": 0, "maximum": 100},
			"reason":        map[string]any{"type": "string"},
			"amount_satang": map[string]any{"anyOf": []any{map[string]any{"type": "integer"}, map[string]any{"type": "null"}}},
			"reference":     map[string]any{"type": "string"},
		},
		"required": []string{"status", "score", "reason", "amount_satang", "reference"},
	}
	payload := map[string]any{
		"model": model, "store": false, "max_output_tokens": 700,
		"input": []any{map[string]any{"role": "user", "content": []any{
			map[string]any{"type": "input_text", "text": prompt},
			map[string]any{"type": "input_image", "image_url": "data:" + mime + ";base64," + base64.StdEncoding.EncodeToString(image), "detail": "high"},
		}}},
		"text": map[string]any{"format": map[string]any{"type": "json_schema", "name": "slip_assessment", "strict": true, "schema": schema}},
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return SlipVerification{}, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(body))
	if err != nil {
		return SlipVerification{}, err
	}
	req.Header.Set("Authorization", "Bearer "+a.APIKey)
	req.Header.Set("Content-Type", "application/json")
	resp, err := client.Do(req)
	if err != nil {
		return SlipVerification{}, err
	}
	defer resp.Body.Close()
	raw, err := io.ReadAll(io.LimitReader(resp.Body, 2<<20))
	if err != nil {
		return SlipVerification{}, err
	}
	if resp.StatusCode < 200 || resp.StatusCode > 299 {
		return SlipVerification{}, fmt.Errorf("slip AI returned %s", resp.Status)
	}
	var response struct {
		OutputText string `json:"output_text"`
		Output     []struct {
			Content []struct {
				Type string `json:"type"`
				Text string `json:"text"`
			} `json:"content"`
		} `json:"output"`
	}
	if err = json.Unmarshal(raw, &response); err != nil {
		return SlipVerification{}, err
	}
	text := response.OutputText
	if text == "" {
		for _, item := range response.Output {
			for _, content := range item.Content {
				if content.Type == "output_text" && content.Text != "" {
					text = content.Text
					break
				}
			}
		}
	}
	var result SlipVerification
	if text == "" || json.Unmarshal([]byte(text), &result) != nil {
		return SlipVerification{}, errors.New("AI returned an unreadable assessment")
	}
	if result.Status != "pass" && result.Status != "suspicious" && result.Status != "reject" {
		return SlipVerification{}, errors.New("AI returned an invalid assessment")
	}
	if result.Score < 0 {
		result.Score = 0
	}
	if result.Score > 100 {
		result.Score = 100
	}
	result.Reason = strings.TrimSpace(result.Reason)
	if len(result.Reason) > 500 {
		result.Reason = result.Reason[:500]
	}
	if result.AmountSatang == nil || *result.AmountSatang != expectedSatang {
		result.Status = "reject"
		result.Score = 100
		result.Reason = "ยอดเงินในสลิปไม่ตรงกับยอดคำสั่งซื้อ หรืออ่านยอดเงินไม่ได้"
	}
	result.CheckedAt = time.Now().UTC().Format(time.RFC3339)
	return result, nil
}

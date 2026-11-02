package server

import (
	"bytes"
	"encoding/json"
	"github.com/gin-gonic/gin"
	"io"
	"net/http"
	"os"
	"strings"
	"time"
)

type contactInput struct {
	ID        string `json:"id" binding:"required,uuid"`
	FirstName string `json:"firstName" binding:"required,max=80"`
	LastName  string `json:"lastName" binding:"required,max=80"`
	Email     string `json:"email" binding:"required,email,max=254"`
	Phone     string `json:"phone" binding:"max=80"`
	Subject   string `json:"subject" binding:"required,oneof=booking group order general"`
	Message   string `json:"message" binding:"required,min=10,max=1500"`
}

func (s *Server) contactRoutes(api *gin.RouterGroup) {
	api.POST("/contact", s.limiter(5), s.submitContact)
}

func (s *Server) submitContact(c *gin.Context) {
	var input contactInput
	if err := c.ShouldBindJSON(&input); err != nil || strings.TrimSpace(input.FirstName) == "" || strings.TrimSpace(input.LastName) == "" || len([]rune(strings.TrimSpace(input.Message))) < 10 {
		c.JSON(400, gin.H{"error": "กรุณาตรวจสอบชื่อ อีเมล และข้อความ"})
		return
	}
	endpoint, key := os.Getenv("CONTACT_SHEETS_URL"), os.Getenv("CONTACT_SHEETS_KEY")
	if !strings.HasPrefix(endpoint, "https://script.google.com/macros/s/") || !strings.HasSuffix(endpoint, "/exec") || key == "" {
		c.JSON(503, gin.H{"error": "ระบบรับข้อความยังไม่พร้อม กรุณาลองใหม่ภายหลัง"})
		return
	}
	body, _ := json.Marshal(struct {
		contactInput
		Token string `json:"token"`
	}{input, key})
	req, err := http.NewRequestWithContext(c.Request.Context(), http.MethodPost, endpoint, bytes.NewReader(body))
	if err != nil {
		c.JSON(503, gin.H{"error": "ไม่สามารถเชื่อมต่อระบบรับข้อความ"})
		return
	}
	req.Header.Set("Content-Type", "application/json")
	client := &http.Client{Timeout: 25 * time.Second}
	res, err := client.Do(req)
	if err != nil {
		c.JSON(502, gin.H{"error": "ยังยืนยันการบันทึกไม่ได้ กรุณาลองส่งใหม่ ข้อมูลเดิมจะไม่ถูกบันทึกซ้ำ"})
		return
	}
	defer res.Body.Close()
	var ack struct {
		OK bool   `json:"ok"`
		ID string `json:"id"`
	}
	if res.StatusCode != 200 || json.NewDecoder(io.LimitReader(res.Body, 4096)).Decode(&ack) != nil || !ack.OK || ack.ID != input.ID {
		c.JSON(502, gin.H{"error": "บันทึกข้อความไม่สำเร็จ กรุณาลองใหม่"})
		return
	}
	c.JSON(200, gin.H{"ok": true, "id": input.ID})
}

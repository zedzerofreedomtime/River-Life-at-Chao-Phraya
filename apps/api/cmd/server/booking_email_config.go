package main

import "errors"

// OTP mode deliberately has no effect on transactional booking delivery.
func bookingEmailEnabled(mode string, smtpConfigured bool) (bool, error) {
	switch mode {
	case "", "smtp":
		return smtpConfigured, nil
	case "disabled":
		return false, nil
	default:
		return false, errors.New("invalid BOOKING_EMAIL_MODE")
	}
}

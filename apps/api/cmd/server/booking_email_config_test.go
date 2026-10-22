package main

import "testing"

func TestBookingEmailConfiguration(t *testing.T) {
	for _, otp := range []string{"smtp", "demo"} {
		t.Run(otp, func(t *testing.T) {
			t.Setenv("OTP_DELIVERY_MODE", otp)
			for _, tc := range []struct {
				mode                      string
				configured, want, invalid bool
			}{
				{"", true, true, false}, {"smtp", true, true, false},
				{"", false, false, false}, {"smtp", false, false, false},
				{"disabled", true, false, false}, {"disabled", false, false, false},
				{"typo", true, false, true},
			} {
				got, err := bookingEmailEnabled(tc.mode, tc.configured)
				if got != tc.want || (err != nil) != tc.invalid {
					t.Fatalf("%+v: enabled=%v error=%v", tc, got, err)
				}
			}
		})
	}
}

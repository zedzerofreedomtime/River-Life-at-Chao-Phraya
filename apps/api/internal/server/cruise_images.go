package server

import (
	"github.com/gin-gonic/gin"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"riverlife/api/internal/service"
)

var cruiseImageName = regexp.MustCompile(`^[a-f0-9]{64}\.(jpg|png|webp)$`)

func (s *Server) cruiseImageRoutes(api *gin.RouterGroup) {
	api.GET("/cruise-images/:name", func(c *gin.Context) {
		name := c.Param("name")
		if !cruiseImageName.MatchString(name) {
			c.Status(404)
			return
		}
		c.Header("Cache-Control", "public, max-age=31536000, immutable")
		c.Header("X-Content-Type-Options", "nosniff")
		c.File(filepath.Join(s.UploadDir, "cruise-images", name))
	})
	api.POST("/dashboard/admin/cruises/images", s.requireRole(service.RoleAdmin), s.limiter(20), func(c *gin.Context) {
		c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 6<<20)
		file, err := c.FormFile("image")
		if err != nil || file.Size <= 0 || file.Size > 5<<20 {
			bad(c)
			return
		}
		src, err := file.Open()
		if err != nil {
			bad(c)
			return
		}
		defer src.Close()
		header := make([]byte, 512)
		n, err := io.ReadFull(src, header)
		if err != nil && err != io.ErrUnexpectedEOF {
			bad(c)
			return
		}
		ext := map[string]string{"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}[http.DetectContentType(header[:n])]
		if ext == "" {
			bad(c)
			return
		}
		directory := filepath.Join(s.UploadDir, "cruise-images")
		if err = os.MkdirAll(directory, 0750); err != nil {
			fail(c, err)
			return
		}
		name := service.Token() + ext
		path := filepath.Join(directory, name)
		dest, err := os.OpenFile(path, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0640)
		if err != nil {
			fail(c, err)
			return
		}
		ok := false
		defer func() {
			_ = dest.Close()
			if !ok {
				_ = os.Remove(path)
			}
		}()
		if _, err = dest.Write(header[:n]); err == nil {
			_, err = io.Copy(dest, src)
		}
		if err != nil {
			fail(c, err)
			return
		}
		if err = dest.Close(); err != nil {
			fail(c, err)
			return
		}
		ok = true
		c.JSON(201, gin.H{"url": "/api/v1/cruise-images/" + name})
	})
}

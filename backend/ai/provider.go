package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"time"

	"github.com/wailsapp/wails/v3/pkg/application"
)

// AIProvider defines the interface for interacting with various AI backends.
type AIProvider interface {
	Complete(ctx context.Context, logs string) (string, error)
}

// Config stores the active provider information.
type Config struct {
	BaseURL     string
	ActiveModel string
}

// Orchestrator manages the AI providers and health checking.
type Orchestrator struct {
	app    *application.App
	config Config
}

func NewOrchestrator(app *application.App) *Orchestrator {
	return &Orchestrator{
		app: app,
		config: Config{
			BaseURL: "http://localhost:11434", // Default to Ollama
		},
	}
}

// StartHealthCheck begins the 5-second polling loop for server availability.
func (o *Orchestrator) StartHealthCheck() {
	go func() {
		ticker := time.NewTicker(5 * time.Second)
		defer ticker.Stop()

		for {
			// Extract host and port from BaseURL
			// Simplified check: since config BaseURL is typically http://localhost:11434
			// We check the port using net.DialTimeout
			host := "localhost:11434" // For Ollama
			if o.config.BaseURL == "http://localhost:1234" {
				host = "localhost:1234" // For LM Studio
			}

			conn, err := net.DialTimeout("tcp", host, 2*time.Second)
			status := "online"
			if err != nil {
				status = "offline"
			} else {
				conn.Close()
			}

			// Emit ai:status
			o.app.Event.Emit("ai:status", status)

			<-ticker.C
		}
	}()
}

// OpenAIProvider implements AIProvider using an OpenAI compatible proxy
type OpenAIProvider struct {
	config Config
	client *http.Client
}

func NewOpenAIProvider(cfg Config) *OpenAIProvider {
	return &OpenAIProvider{
		config: cfg,
		client: &http.Client{Timeout: 30 * time.Second},
	}
}

func (p *OpenAIProvider) Complete(ctx context.Context, logs string) (string, error) {
	// Simple proxy payload
	payload := map[string]interface{}{
		"model": p.config.ActiveModel,
		"messages": []map[string]string{
			{"role": "system", "content": "You are an AI Log-Physician. Diagnose the following LaTeX error."},
			{"role": "user", "content": logs},
		},
	}
	body, _ := json.Marshal(payload)

	req, err := http.NewRequestWithContext(ctx, "POST", p.config.BaseURL+"/v1/chat/completions", bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := p.client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("unexpected status code: %d", resp.StatusCode)
	}

	var result struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}
	if len(result.Choices) > 0 {
		return result.Choices[0].Message.Content, nil
	}
	return "", fmt.Errorf("no completion returned")
}

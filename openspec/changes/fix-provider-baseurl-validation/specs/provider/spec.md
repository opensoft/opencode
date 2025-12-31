## ADDED Requirements

### Requirement: Provider baseURL Validation

The system SHALL validate that `baseURL` values passed to provider SDKs are valid URLs (starting with `http://` or `https://`). Invalid or empty values SHALL be removed so the SDK can use its default endpoint.

#### Scenario: User misconfigures api field with provider name

- **WHEN** user sets `"api": "anthropic"` in config instead of a URL
- **THEN** the invalid value is filtered out
- **AND** the SDK uses its default baseURL (`https://api.anthropic.com/v1`)

#### Scenario: baseURL is empty string

- **WHEN** baseURL is set to empty string `""`
- **THEN** the empty value is deleted from options
- **AND** the SDK uses its default baseURL

#### Scenario: baseURL is null from models.dev

- **WHEN** models.dev API returns `"api": null` for a provider
- **THEN** the null value does not override SDK defaults
- **AND** the SDK uses its hardcoded default baseURL

#### Scenario: Valid baseURL is preserved

- **WHEN** baseURL is a valid URL like `"https://custom-proxy.example.com/v1"`
- **THEN** the URL is passed to the SDK unchanged
- **AND** the SDK uses the custom baseURL

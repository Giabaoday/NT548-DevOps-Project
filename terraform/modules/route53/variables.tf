variable "domain_name" {
  description = "Domain name for the application (e.g., example.com)"
  type        = string
}

variable "environment" {
  description = "Deployment environment (dev, prod, etc.)"
  type        = string
}

variable "api_gateway_domain_name" {
  description = "API Gateway custom domain name"
  type        = string
}

variable "api_gateway_hosted_zone_id" {
  description = "API Gateway hosted zone ID"
  type        = string
}

variable "additional_records" {
  description = "Additional DNS records to create"
  type        = list(any)
  default     = []
}

variable "tags" {
  description = "Tags to apply to Route53 resources"
  type        = map(string)
  default     = {}
}
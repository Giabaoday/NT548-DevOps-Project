variable "environment" {
  description = "Deployment environment (dev, prod, etc.)"
  type        = string
}

variable "api_name" {
  description = "Name of the API Gateway"
  type        = string
  default     = "traceability-api"
}

variable "aws_region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "ap-southeast-1"
}

variable "domain_name" {
  description = "Base domain name for the application"
  type        = string
  default     = "example.com"
}

variable "frontend_domain" {
  description = "Frontend domain URL for CORS configuration"
  type        = string
  default     = "https://app.example.com"
}

variable "certificate_arn" {
  description = "ARN of the ACM certificate for custom domain"
  type        = string
  default     = ""
}

# Routes và Lambda functions
variable "routes" {
  description = "Map of API Gateway routes and their configurations"
  type        = map(any)
  default     = {}
}

variable "lambda_permissions" {
  description = "Map of Lambda function names that need API Gateway permissions"
  type        = map(string)
  default     = {}
}

# Cognito User Pool
variable "cognito_user_pool_client" {
  description = "Cognito User Pool Client for authorizer"
  type        = object({
    id = string
  })
}

variable "cognito_user_pool" {
  description = "Cognito User Pool for authorizer"
  type        = object({
    id = string
  })
}

# Tags
variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}

variable "cognito_user_pool_id" {
  description = "ID of the Cognito User Pool created manually"
  type        = string
}

variable "cognito_client_id" {
  description = "ID of the Cognito User Pool Client created manually"
  type        = string
}
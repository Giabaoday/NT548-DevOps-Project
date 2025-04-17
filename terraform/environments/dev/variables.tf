variable "aws_region" {
  description = "AWS region to deploy the resources"
  type        = string
  default     = "ap-southeast-1"
}

variable "environment" {
  description = "Deployment environment (dev, test, prod)"
  type        = string
  default     = "dev"
}

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "traceability"
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = "example.com"
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "List of availability zones"
  type        = list(string)
  default     = ["ap-southeast-1a", "ap-southeast-1b", "ap-southeast-1c"]
}

variable "private_subnets" {
  description = "CIDR blocks for private subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}

variable "public_subnets" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
}

variable "app_version" {
  description = "Version of the application"
  type        = string
  default     = "latest"
}

variable "certificate_arn" {
  description = "ARN of the certificate for API Gateway"
  type        = string
  default     = "" # Cần điền ARN của certificate thực tế
}

variable "cognito_user_pool_id" {
  description = "ID of the Cognito User Pool"
  type        = string
  default     = "" # Cần điền ID thực tế
}

variable "cognito_client_id" {
  description = "ID of the Cognito User Pool Client"
  type        = string
  default     = "" # Cần điền Client ID thực tế
}

variable "blockchain_endpoint" {
  description = "Endpoint for private blockchain"
  type        = string
  default     = "http://blockchain-service:8545" # Sẽ được cấu hình qua Kubernetes service
}
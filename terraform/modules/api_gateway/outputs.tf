output "api_gateway_id" {
  description = "ID of the API Gateway"
  value       = module.api_gateway.apigatewayv2_api_id
}

output "api_gateway_arn" {
  description = "ARN of the API Gateway"
  value       = module.api_gateway.apigatewayv2_api_arn
}

output "api_gateway_execution_arn" {
  description = "Execution ARN of the API Gateway"
  value       = module.api_gateway.apigatewayv2_api_execution_arn
}

output "api_endpoint" {
  description = "API Gateway endpoint URL"
  value       = module.api_gateway.apigatewayv2_api_api_endpoint
}

output "api_stage_url" {
  description = "Default stage API Gateway URL"
  value       = module.api_gateway.default_apigatewayv2_stage_invoke_url
}

output "api_domain_name" {
  description = "Custom domain name of the API"
  value       = var.environment == "prod" ? "api.${var.domain_name}" : "dev-api.${var.domain_name}"
}

output "cloudwatch_log_group_name" {
  description = "Name of the CloudWatch log group for API Gateway"
  value       = aws_cloudwatch_log_group.api_gateway_logs.name
}

output "api_routes" {
  description = "Map of API routes created"
  value       = module.api_gateway.apigatewayv2_api_mapping
}
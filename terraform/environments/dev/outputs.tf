output "vpc_id" {
  description = "ID of the VPC"
  value       = module.vpc.vpc_id
}

/*output "eks_cluster_name" {
  description = "Name of the EKS cluster"
  value       = module.eks.cluster_name
}*/

output "dynamodb_table_name" {
  description = "Name of the DynamoDB table"
  value       = module.tracer_table.table_id
}

/*output "lambda_functions" {
  description = "ARNs of the Lambda functions"
  value = {
    product_service = module.product_service.function_arn
    trace_service   = module.trace_service.function_arn
    user_service    = module.user_service.function_arn
  }
}

output "api_gateway_endpoint" {
  description = "API Gateway endpoint URL"
  value       = module.api_gateway.api_endpoint
}

output "api_gateway_custom_domain" {
  description = "API Gateway custom domain"
  value       = module.api_gateway.api_domain_name
}

output "route53_name_servers" {
  description = "Route53 name servers"
  value       = module.route53.name_servers
}
*/

output "s3_buckets" {
  description = "S3 bucket names"
  value = {
    lambda_deployments = module.lambda_deployment_bucket.bucket_name
    frontend_assets    = module.frontend_assets_bucket.bucket_name
  }
}
output "table_arn" {
  description = "The ARN of the DynamoDB table."
  value       = module.dynamodb_table.table_arn
}

output "table_id" {
  description = "The ID of the DynamoDB table."
  value       = module.dynamodb_table.table_id
}

output "tabel_name" {
  description = "The name of the DynamoDB table."
  value       = module.dynamodb_table.table_name
}

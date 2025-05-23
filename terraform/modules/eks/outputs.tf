output "cluster_id" {
  description = "The ID of the EKS cluster"
  value       = module.eks.cluster_id

}

output "cluster_arn" {
  description = "The ARN of the EKS cluster"
  value       = module.eks.cluster_arn

}

output "cluster_name" {
  description = "The name of the EKS cluster"
  value       = module.eks.cluster_name

}

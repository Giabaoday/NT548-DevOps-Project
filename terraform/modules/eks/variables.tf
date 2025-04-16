variable "cluster_name" {
  description = "Name of the EKS cluster"
  type        = string
  default     = "my-eks-cluster"
}

variable "tags" {
  description = "Tags to apply to the EKS cluster and its resources"
  type        = map(string)
}

variable "vpc_id" {
  description = "VPC ID where the EKS cluster will be created"
  type        = string
}

variable "vpc_private_subnet_ids" {
  description = "List of private subnet IDs for the EKS cluster"
  type        = list(string)
}
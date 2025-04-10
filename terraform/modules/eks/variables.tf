variable "cluster_name" {
  description = "Name of the EKS cluster"
  type        = string
  default     = "my-eks-cluster"
}

variable "tags" {
  description = "Tags to apply to the EKS cluster and its resources"
  type        = map(string)
}

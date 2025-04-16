module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.0"

  cluster_name    = var.cluster_name
  cluster_version = "1.31"

  bootstrap_self_managed_addons = false
  cluster_addons = {
    coredns                = {}
    eks-pod-identity-agent = {}
    kube-proxy             = {}
    vpc-cni                = {}
  }

  vpc_id     = var.vpc_id
  subnet_ids = var.vpc_private_subnet_ids

  eks_managed_node_groups = {
    appnodegroup = {
      ami_type       = "AL2023_x86_64_STANDARD"
      instance_types = ["t3.micro"]

      min_size     = 1
      max_size     = 2
      desired_size = 1
    }

    blockchainnodegroup = {
      ami_type       = "AL2023_x86_64_STANDARD"
      instance_types = ["t3.micro"]

      min_size     = 1
      max_size     = 2
      desired_size = 1
    }

    monitoringnodegroup = {
      ami_type       = "AL2023_x86_64_STANDARD"
      instance_types = ["t3.micro"]

      min_size     = 1
      max_size     = 2
      desired_size = 1
    }

    argocdnodegroup = {
      ami_type       = "AL2023_x86_64_STANDARD"
      instance_types = ["t3.micro"]

      min_size     = 1
      max_size     = 2
      desired_size = 1
    }
  }
  tags = var.tags
}

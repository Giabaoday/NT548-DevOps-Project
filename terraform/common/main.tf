terraform {
  backend "s3" {
    bucket         = "remote-backend-s3-giabao22520120"
    key            = "common/terraform.tfstate"
    region         = "ap-southeast-1"
    dynamodb_table = "remote-backend-locks"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region
}

# Tạo VPC
module "vpc" {
  source = "../modules/vpc"

  vpc_name           = "${var.project_name}-vpc"
  vpc_cidr           = var.vpc_cidr
  availability_zones = var.availability_zones
  private_subnets    = var.private_subnets
  public_subnets     = var.public_subnets

  tags = {
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "Terraform"
  }
}
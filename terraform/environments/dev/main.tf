provider "aws" {
  region = var.aws_region
}

# Tạo VPC
module "vpc" {
  source = "./modules/vpc"

  vpc_name           = "${var.project_name}-vpc-${var.environment}"
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

# Tạo S3 buckets
module "lambda_deployment_bucket" {
  source = "./modules/s3"

  bucket_name = "${var.project_name}-lambda-deployments-${var.environment}"
}

module "frontend_assets_bucket" {
  source = "./modules/s3"

  bucket_name = "${var.project_name}-frontend-assets-${var.environment}"
}

# Tạo DynamoDB table
module "traceability_table" {
  source = "./modules/dynamodb_table"

  table_name = "${var.project_name}-data-${var.environment}"

  tags = {
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "Terraform"
  }
}


/*
# Tạo Lambda functions
module "product_service" {
  source = "./modules/lambda"
  
  function_name = "product-service"
  description   = "Product management service for traceability application"
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  
  s3_bucket     = module.lambda_deployment_bucket.bucket_name
  version       = var.app_version
  environment   = var.environment
  region        = var.aws_region
  
  dynamodb_table = module.traceability_table.tabel_name
  dynamodb_arn   = module.traceability_table.table_arn
  
  additional_environment_variables = {
    BLOCKCHAIN_ENDPOINT = var.blockchain_endpoint
    COGNITO_USER_POOL   = var.cognito_user_pool_id
  }
  
  tags = {
    Environment = var.environment
    Project     = var.project_name
    Service     = "ProductService"
  }
}

module "trace_service" {
  source = "./modules/lambda"
  
  function_name = "trace-service"
  description   = "Trace management service for traceability application"
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  
  s3_bucket     = module.lambda_deployment_bucket.bucket_name
  version       = var.app_version
  environment   = var.environment
  region        = var.aws_region
  
  dynamodb_table = module.traceability_table.tabel_name
  dynamodb_arn   = module.traceability_table.table_arn
  
  additional_environment_variables = {
    BLOCKCHAIN_ENDPOINT = var.blockchain_endpoint
    COGNITO_USER_POOL   = var.cognito_user_pool_id
  }
  
  tags = {
    Environment = var.environment
    Project     = var.project_name
    Service     = "TraceService"
  }
}

module "user_service" {
  source = "./modules/lambda"
  
  function_name = "user-service"
  description   = "User management service for traceability application"
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  
  s3_bucket     = module.lambda_deployment_bucket.bucket_name
  version       = var.app_version
  environment   = var.environment
  region        = var.aws_region
  
  dynamodb_table = module.traceability_table.tabel_name
  dynamodb_arn   = module.traceability_table.table_arn
  
  additional_environment_variables = {
    COGNITO_USER_POOL = var.cognito_user_pool_id
  }
  
  tags = {
    Environment = var.environment
    Project     = var.project_name
    Service     = "UserService"
  }
}

# Tạo API Gateway
module "api_gateway" {
  source = "./modules/api_gateway"
  
  environment   = var.environment
  api_name      = "${var.project_name}-api"
  aws_region    = var.aws_region
  domain_name   = var.domain_name
  frontend_domain = "https://${var.environment == "prod" ? "" : "${var.environment}."}${var.domain_name}"
  certificate_arn = var.certificate_arn
  
  # Cognito config (được tạo thủ công hoặc bởi module khác)
  cognito_user_pool_id = var.cognito_user_pool_id
  cognito_client_id    = var.cognito_client_id
  cognito_user_pool    = { id = var.cognito_user_pool_id }
  cognito_user_pool_client = { id = var.cognito_client_id }
  
  # Định nghĩa các routes
  routes = {
    "GET /products" = {
      integration_uri    = module.product_service.invoke_arn
      integration_type   = "AWS_PROXY"
      integration_method = "POST"
      authorizer_key     = "cognito"
    },
    "GET /products/{id}" = {
      integration_uri    = module.product_service.invoke_arn
      integration_type   = "AWS_PROXY"
      integration_method = "POST"
      authorizer_key     = "cognito"
    },
    "POST /products" = {
      integration_uri    = module.product_service.invoke_arn
      integration_type   = "AWS_PROXY"
      integration_method = "POST"
      authorizer_key     = "cognito"
    },
    "GET /traces/{id}" = {
      integration_uri    = module.trace_service.invoke_arn
      integration_type   = "AWS_PROXY"
      integration_method = "POST"
      authorizer_key     = "cognito"
    },
    "POST /traces" = {
      integration_uri    = module.trace_service.invoke_arn
      integration_type   = "AWS_PROXY"
      integration_method = "POST"
      authorizer_key     = "cognito"
    },
    "GET /users/me" = {
      integration_uri    = module.user_service.invoke_arn
      integration_type   = "AWS_PROXY"
      integration_method = "POST"
      authorizer_key     = "cognito"
    }
  }
  
  # Cấp quyền cho API Gateway để gọi Lambda functions
  lambda_permissions = {
    "product_service" = module.product_service.function_name,
    "trace_service"   = module.trace_service.function_name,
    "user_service"    = module.user_service.function_name
  }
  
  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

# Tạo EKS Cluster
module "eks" {
  source = "./modules/eks"
  
  cluster_name = "${var.project_name}-eks-${var.environment}"
  vpc_id       = module.vpc.vpc_id
  vpc_private_subnet_ids = module.vpc.private_subnets
  
  tags = {
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "Terraform"
  }
}

# Tạo Route53 records
module "route53" {
  source = "./modules/route53"
  
  domain_name = var.domain_name
  environment = var.environment
  
  api_gateway_domain_name   = module.api_gateway.api_domain_name
  api_gateway_hosted_zone_id = "Z2FDTNDATAQYW2"  # Default CloudFront hosted zone ID
  
  additional_records = [
    {
      name = var.environment == "prod" ? "app" : "${var.environment}-app"
      type = "CNAME"
      ttl  = 300
      records = ["${var.environment == "prod" ? "" : "${var.environment}-"}app.${var.domain_name}.s3-website.${var.aws_region}.amazonaws.com"]
    }
  ]
  
  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}  */
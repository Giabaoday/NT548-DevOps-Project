terraform {
  backend "s3" {
    bucket         = "remote-backend-s3-giabao22520120"
    key            = "environments/dev/terraform.tfstate"
    region         = "ap-southeast-1"
    dynamodb_table = "remote-backend-locks"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region
}

# Tạo S3 buckets
module "lambda_deployment_bucket" {
  source = "../../modules/s3"

  bucket_name = "${var.project_name}-lambda-deployments-${var.environment}"
}

module "frontend_assets_bucket" {
  source = "../../modules/s3"

  bucket_name = "${var.project_name}-frontend-assets-${var.environment}"
}

# Tạo DynamoDB table
module "tracer_table" {
  source = "../../modules/dynamodb_table"

  table_name = "${var.project_name}-data-${var.environment}"

  tags = {
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "Terraform"
  }
}

module "lambda_service" {
  source = "../../modules/lambda"

  function_name = "lambda_service"
  description   = "Service for product tracer application"
  handler       = "index.handler"
  runtime       = "nodejs20.x"

  s3_bucket   = module.lambda_deployment_bucket.bucket_name
  app_version = var.app_version
  environment = var.environment
  region      = var.aws_region

  dynamodb_table = module.tracer_table.table_id
  dynamodb_arn   = module.tracer_table.table_arn

  additional_environment_variables = {
    COGNITO_USER_POOL = var.cognito_user_pool_id
    COGNITO_CLIENT_ID = var.cognito_client_id
  }

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

# Tạo API Gateway
module "api_gateway" {
  source = "../../modules/api_gateway"

  environment     = var.environment
  api_name        = "${var.project_name}-api"
  aws_region      = var.aws_region

  # Cognito config (được tạo thủ công hoặc bởi module khác)
  cognito_user_pool_id     = var.cognito_user_pool_id
  cognito_client_id        = var.cognito_client_id
  cognito_user_pool        = { id = var.cognito_user_pool_id }
  cognito_user_pool_client = { id = var.cognito_client_id }

  # Định nghĩa các routes
  routes = {
    "GET /users/me" = {
      integration = {
        integration_uri    = module.lambda_service.invoke_arn
        integration_type   = "AWS_PROXY"
        integration_method = "POST"
      }
      authorizer_key = "cognito"
    }
  }
  # Cấp quyền cho API Gateway để gọi Lambda functions
  lambda_permissions = {
    "lambda_service" = module.lambda_service.function_name
  }

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}


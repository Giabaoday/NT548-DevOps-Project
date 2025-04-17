module "api_gateway" {
  source = "terraform-aws-modules/apigateway-v2/aws"

  name          = "${var.api_name}-${var.environment}"
  description   = "API Gateway for Product Tracer App - ${upper(var.environment)}"
  protocol_type = "HTTP"

  # Cấu hình CORS
  cors_configuration = {
    allow_headers     = ["Content-Type", "Authorization", "X-Amz-Date", "X-Api-Key", "X-Amz-Security-Token"]
    allow_methods     = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    allow_origins     = var.environment == "prod" ? [var.frontend_domain] : ["*"]
    allow_credentials = true
    max_age           = 300
  }

  # Cấu hình domain tùy chọn (nếu cần)
  domain_name                 = var.environment == "prod" ? "api.${var.domain_name}" : "dev-api.${var.domain_name}"
  domain_name_certificate_arn = var.certificate_arn

  # Cấu hình Access Logs
  stage_access_log_settings = {
    create_log_group            = true
    log_group_retention_in_days = 7
    format = jsonencode({
      context = {
        domainName              = "$context.domainName"
        integrationErrorMessage = "$context.integrationErrorMessage"
        protocol                = "$context.protocol"
        requestId               = "$context.requestId"
        requestTime             = "$context.requestTime"
        responseLength          = "$context.responseLength"
        routeKey                = "$context.routeKey"
        stage                   = "$context.stage"
        status                  = "$context.status"
        error = {
          message      = "$context.error.message"
          responseType = "$context.error.responseType"
        }
        identity = {
          sourceIP = "$context.identity.sourceIp"
        }
        integration = {
          error             = "$context.integration.error"
          integrationStatus = "$context.integration.integrationStatus"
        }
      }
    })
  }

  # Cấu hình authorizer sử dụng Cognito
  authorizers = {
    "cognito" = {
      authorizer_type  = "JWT"
      identity_sources = ["$request.header.Authorization"]
      name             = "cognito-authorizer"
      jwt_configuration = {
        audience = [var.cognito_client_id]
        issuer   = "https://cognito-idp.${var.aws_region}.amazonaws.com/${var.cognito_user_pool_id}"
      }
    }
  }

  # Định nghĩa các routes và integrations
  routes = var.routes

  tags = merge(
    var.tags,
    {
      Environment = var.environment
      Name        = "${var.api_name}-${var.environment}"
    }
  )
}

# Tạo Cloudwatch Log Group cho API Gateway
resource "aws_cloudwatch_log_group" "api_gateway_logs" {
  name              = "/aws/apigateway/${var.environment}-tracer-api"
  retention_in_days = var.environment == "prod" ? 30 : 7

   tags = merge(
    var.tags,
    {
      Environment = var.environment
      Name        = "${var.api_name}-logs-${var.environment}"
    }
  )
}

# Cấp quyền cho API Gateway để gọi các Lambda functions
resource "aws_lambda_permission" "api_gateway_lambda" {
  for_each = var.lambda_permissions

  statement_id  = "AllowAPIGatewayInvoke-${each.key}"
  action        = "lambda:InvokeFunction"
  function_name = each.value
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${module.api_gateway.apigatewayv2_api_execution_arn}/*/*"
}

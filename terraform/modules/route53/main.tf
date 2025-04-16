module "zones" {
  source  = "terraform-aws-modules/route53/aws//modules/zones"
  version = "~> 3.0"
  
  zones = {
    "${var.domain_name}" = {
      comment = "${var.domain_name} (${var.environment})"
      tags = {
        Environment = var.environment
      }
    }
  }
  
  tags = merge(
    var.tags,
    {
      ManagedBy = "Terraform"
    }
  )
}

module "records" {
  source   = "terraform-aws-modules/route53/aws//modules/records"
  version  = "~> 3.0"
  zone_name = keys(module.zones.route53_zone_zone_id)[0]
  
  records = concat(
    # API Gateway records
    [
      {
        name    = var.environment == "prod" ? "api" : "${var.environment}-api"
        type    = "A"
        alias   = {
          name    = var.api_gateway_domain_name
          zone_id = var.api_gateway_hosted_zone_id
        }
      }
    ],
    
    # Các records khác nếu cần
    var.additional_records
  )
  
  depends_on = [module.zones]
}
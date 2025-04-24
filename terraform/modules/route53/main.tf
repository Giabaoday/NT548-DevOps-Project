data "aws_route53_zone" "this" {
  name = var.domain_name
}

module "records" {
  source    = "terraform-aws-modules/route53/aws//modules/records"
  version   = "~> 3.0"
  
  zone_id = data.aws_route53_zone.this.zone_id

  records = concat(
    # API Gateway records
    [
      {
        name = var.environment == "prod" ? "api" : "${var.environment}-api"
        type = "A"
        alias = {
          name    = var.api_gateway_domain_name
          zone_id = var.api_gateway_hosted_zone_id
        }
      }
    ],

    # Các records khác nếu cần
    var.additional_records
  )
}
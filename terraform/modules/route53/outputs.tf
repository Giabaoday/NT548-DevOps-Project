output "zone_id" {
  description = "The ID of the Route53 zone"
  value       = module.zones.route53_zone_zone_id
}

output "zone_name" {
  description = "The name of the Route53 zone"
  value       = module.zones.route53_zone_name
}

output "name_servers" {
  description = "Name servers of the Route53 zone"
  value       = module.zones.route53_zone_name_servers
}

output "record_names" {
  description = "List of DNS record names created"
  value       = module.records.route53_record_name
}

output "record_fqdns" {
  description = "List of fully qualified domain names of the records"
  value       = module.records.route53_record_fqdn
}
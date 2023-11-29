#!/bin/bash

# Set the project ID and region
PROJECT_ID=YOUR_PROJECT_ID
REGION=us-central1

set -e

# Create a regional NEG with network endpoint type 'internet-ip-port'
gcloud compute network-endpoint-groups create csp-plaques-neg --region us-central1 --network csp-network --network-endpoint-type internet-ip-port

# Copy the contents of the GCS bucket to the serverless NEG
gsutil cp -r gs://csp_plaques gs://csp-plaques-neg

# Add the serverless NEG as a backend
gcloud compute backend-services add-backend csp-plaques-backend-service gs://csp-plaques-neg

# Create a health check
gcloud compute health-checks create csp-plaques-health-check --request-path /

# Associate the health check with the backend service
gcloud compute backend-services add-health-check csp-plaques-backend-service csp-plaques-health-check

# Create a firewall rule
gcloud compute firewall-rules create csp-plaques-firewall-rule --allow tcp:80 --target-tags csp-plaques-backend-service

# Create a load balancer
gcloud compute load-balancers create csp-plaques-load-balancer --region $REGION --backend-service csp-plaques-backend-service

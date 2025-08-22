docker run \
  --name netsight-app \
  -p 3000:3000 \
  -e DATABASE_URL="postgresql://postgres:changethis@172.16.1.16:5432/NetSight" \
  -e OPENAI_API_KEY="fdd" \
  -e OPENAI_BASE_URL="dkk" \
  --restart unless-stopped \
  -d \
  next-app
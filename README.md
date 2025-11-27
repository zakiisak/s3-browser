# S3 Browser for Hetzner Object Storage

A simple and elegant web-based browser for Hetzner Object Storage (S3-compatible).

## Features

- 🎨 Modern, elegant UI with dark theme
- 📁 Browse folders and files
- ⬆️ Upload files to any folder
- ⬇️ Download files with one click
- 🗑️ Delete files and folders
- 🍞 Breadcrumb navigation
- 📱 Responsive design
- ✨ Full CRUD operations (Create, Read, Update, Delete)

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure your Hetzner credentials:**
   - Copy `.env.example` to `.env`
   - Fill in your Hetzner Object Storage credentials:
     ```
     S3_ENDPOINT=https://your-bucket-name.your-region.hetzner.cloud
     S3_REGION=nbg1
     S3_BUCKET_NAME=your-bucket-name
     AWS_ACCESS_KEY_ID=your-access-key
     AWS_SECRET_ACCESS_KEY=your-secret-key
     ```

3. **Start the server:**
   ```bash
   npm start
   ```

4. **Open your browser:**
   Navigate to `http://localhost:3000`

## Getting Your Hetzner Credentials

1. Log in to your Hetzner Cloud Console
2. Go to Object Storage
3. Create or select a bucket
4. Go to Access Keys section
5. Create a new access key
6. Use the endpoint URL, access key, and secret key in your `.env` file

## Notes

- The endpoint format for Hetzner is: `https://bucket-name.region.hetzner.cloud`
- Make sure your bucket name matches the one in the endpoint URL
- The server runs on port 3000 by default (configurable via `PORT` in `.env`)

## License

MIT


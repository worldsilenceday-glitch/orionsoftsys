# SYSTEM AUDIT TASK

Perform a complete audit of the repository before making any changes.

## Check for:

### Frontend Issues
- Broken links between pages
- Incorrect API URLs (localhost usage)
- Missing or broken assets (images, CSS, JS)
- Non-functional forms (login/register/contact)

### Backend Issues
- Broken API routes
- Missing controllers or services
- Improper error handling
- Incorrect environment variable usage

### Database
- PostgreSQL connection issues
- Missing tables or schemas
- Query errors

### Security
- Exposed API keys
- Missing authentication validation
- Unsafe input handling

### Performance
- Large assets
- Unoptimized scripts
- Blocking rendering

## Output
- Generate a structured audit report
- Identify root causes
- Do NOT fix yet — only report first

import { NextRequest, NextResponse } from 'next/server'
import { env } from '@/lib/env'
import { createLogger } from '@/lib/logs/console-logger'

const logger = createLogger('RedtailContactSearch')

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    
    // Get hardcoded credentials
    const apiKey = env.REDTAIL_API_KEY
    const userKey = env.REDTAIL_USER_KEY
    
    if (!apiKey || !userKey) {
      logger.error('Redtail credentials not configured')
      return NextResponse.json(
        { error: 'Redtail credentials not configured' },
        { status: 500 }
      )
    }
    
    // Format credentials for UserKeyAuth
    const credentials = `${apiKey}:${userKey}`
    const encodedCredentials = Buffer.from(credentials).toString('base64')
    
    // Build search URL
    const searchUrl = new URL('https://review.crm.redtailtechnology.com/api/public/v1/contacts/search')    
    // Add search parameters
    if (query) {
      searchUrl.searchParams.set('formatted_full_name', query)
    }
    
    logger.info('Searching Redtail contacts', { query, url: searchUrl.toString() })
    
    // Make request to Redtail API
    const response = await fetch(searchUrl.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Userkeyauth ${encodedCredentials}`,
        'Content-Type': 'application/json',
      },
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      logger.error('Redtail search failed', { 
        status: response.status, 
        statusText: response.statusText,
        error: errorText 
      })
      return NextResponse.json(
        { error: `Search failed: ${response.status} ${response.statusText}` },
        { status: response.status }
      )
    }
    
    const data = await response.json()
    
    // Transform the response to a format suitable for dropdowns
    const contacts = data.contacts || []
    const options = contacts.map((contact: any) => ({
      id: contact.id,
      label: contact.formatted_full_name || `${contact.first_name} ${contact.last_name}`.trim(),
      value: contact.id,
      // Include additional info that might be useful
      email: contact.emails?.[0]?.address || '',
      phone: contact.phones?.[0]?.number || '',
    }))
    
    return NextResponse.json({ options })
    
  } catch (error) {
    logger.error('Error in contact search', { error })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 
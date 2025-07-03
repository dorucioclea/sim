import { createLogger } from '@/lib/logs/console-logger'
import { env } from '@/lib/env'
import type { ToolConfig } from '../types'
import type { RedtailResponse, RedtailReadParams } from './types'

const logger = createLogger('RedtailReadContact')

export const redtailReadContactTool: ToolConfig<RedtailReadParams, RedtailResponse> = {
  id: 'redtail_read_contact',
  name: 'Read Redtail Contact',
  description: 'Read contact information from Redtail CRM',
  version: '1.0.0',
  params: {
    contactId: {
      type: 'dropdown',
      required: false, // Make optional so we can get list when none selected
      description: 'The ID of the contact to read (optional - if not provided, returns list of contacts)',
    },
    page: {
      type: 'input',
      required: false,
      description: 'Page number for contact list (default: 1)',
    },
  },
  request: {
    url: (params) => {
      const baseUrl = 'https://review.crm.redtailtechnology.com/api/public/v1'
      
      if (params.contactId) {
        // Get specific contact by ID
        const url = new URL(`${baseUrl}/contacts/${params.contactId}`)
        url.searchParams.set('recently_viewed', 'true')
        return url.toString()
      } else {
        // Get list of contacts
        const url = new URL(`${baseUrl}/contacts`)
        url.searchParams.set('page', (params.page || 1).toString())
        return url.toString()
      }
    },
    method: 'GET',
    headers: (params) => {
      const apiKey = env.REDTAIL_API_KEY
      const userKey = env.REDTAIL_USER_KEY
      
      if (!apiKey || !userKey) {
        throw new Error('Redtail credentials not configured. Please set REDTAIL_API_KEY and REDTAIL_USER_KEY environment variables.')
      }
      
      // Format: "APIKey:UserKey" 
      const credentials = `${apiKey}:${userKey}`
      const encodedCredentials = Buffer.from(credentials).toString('base64')
      
      // Set different include headers based on whether we're getting a specific contact or list
      const includeHeader = params.contactId 
        ? 'addresses,phones,emails,urls'
        : 'addresses,phones,emails,urls,family,family.members,tag_memberships'
      
      const headers: Record<string, string> = {
        'Authorization': `Userkeyauth ${encodedCredentials}`,
        'Content-Type': 'application/json',
        'include': includeHeader,
      }
      
      // Add pagesize header for list requests
      if (!params.contactId) {
        headers['pagesize'] = (params.page || 1).toString()
      }
      
      return headers
    },
  },
  transformResponse: async (response: Response, params?: RedtailReadParams) => {
    if (!response.ok) {
      const errorText = await response.text()
      logger.error(
        `Redtail contact API error: ${response.status} ${response.statusText}`,
        errorText
      )
      throw new Error(
        `Failed to read Redtail contact: ${response.status} ${response.statusText} - ${errorText}`
      )
    }

    const data = await response.json()

    if (!data) {
      return {
        success: false,
        output: {
          metadata: {
            operation: 'read_contact' as const,
            contactId: params?.contactId,
            itemType: 'contact' as const,
          },
        },
      }
    }

    // Handle different response structures
    if (params?.contactId) {
      // Single contact response
      if (data.contact) {
        return {
          success: true,
          output: {
            contact: data.contact,
            metadata: {
              operation: 'read_contact' as const,
              itemId: data.contact.id,
              contactId: params.contactId,
              itemType: 'contact' as const,
            },
          },
        }
      } else {
        // Direct contact object
        return {
          success: true,
          output: {
            contact: data,
            metadata: {
              operation: 'read_contact' as const,
              itemId: data.id,
              contactId: params.contactId,
              itemType: 'contact' as const,
            },
          },
        }
      }
    } else {
      // Multiple contacts response
      if (data.contacts) {
        const contacts = Array.isArray(data.contacts) ? data.contacts : [data.contacts]
        
        return {
          success: true,
          output: {
            contacts,
            meta: data.meta, // Include pagination info
            metadata: {
              operation: 'read_contact' as const,
              itemType: 'contact' as const,
            },
          },
        }
      }
    }

    // Fallback for unexpected response structure
    return {
      success: true,
      output: {
        contact: data,
        metadata: {
          operation: 'read_contact' as const,
          contactId: params?.contactId,
          itemType: 'contact' as const,
        },
      },
    }
  },
  transformError: (error) => {
    if (error instanceof Error) {
      return error.message
    }

    if (typeof error === 'object' && error !== null) {
      if (error.error) {
        return typeof error.error === 'string' ? error.error : JSON.stringify(error.error)
      }
      if (error.message) {
        return error.message
      }
    }

    return 'An error occurred while reading Redtail contact'
  },
}
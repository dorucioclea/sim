import { createLogger } from '@/lib/logs/console-logger'
import { env } from '@/lib/env'
import type { ToolConfig } from '../types'
import type { RedtailResponse, RedtailReadParams } from './types'

const logger = createLogger('RedtailReadAccount')

export const redtailReadAccountTool: ToolConfig<RedtailReadParams, RedtailResponse> = {
  id: 'redtail_read_account',
  name: 'Read Redtail Account',
  description: 'Read account information for a contact from Redtail CRM',
  version: '1.0.0',
  params: {
    contactId: {
      type: 'dropdown',
      required: true,
      description: 'The ID of the contact whose accounts to read',
    },
    page: {
      type: 'input',
      required: false,
      description: 'Page number for account list (default: 1)',
    },
    includeAssets: {
      type: 'checkbox',
      required: false,
      description: 'Include assets with each account (default: true)',
    },
  },
  request: {
    url: (params) => {
      if (!params.contactId) {
        throw new Error('Contact ID is required')
      }
      
      const baseUrl = `https://review.crm.redtailtechnology.com/api/public/v1/contacts/${params.contactId}/accounts`
      const url = new URL(baseUrl)
      
      // Add query parameters
      url.searchParams.set('page', (params.page || 1).toString())
      
      // Include assets by default (true unless explicitly set to false)
      const includeAssets = params.includeAssets !== false
      if (includeAssets) {
        url.searchParams.set('assets', 'true')
      }
      
      return url.toString()
    },
    method: 'GET',
    headers: () => {
      const apiKey = env.REDTAIL_API_KEY
      const userKey = env.REDTAIL_USER_KEY
      
      if (!apiKey || !userKey) {
        throw new Error('Redtail credentials not configured. Please set REDTAIL_API_KEY and REDTAIL_USER_KEY environment variables.')
      }
      
      // Format: "APIKey:UserKey" 
      const credentials = `${apiKey}:${userKey}`
      const encodedCredentials = Buffer.from(credentials).toString('base64')
      
      return {
        Authorization: `Userkeyauth ${encodedCredentials}`,
        'Content-Type': 'application/json',
      }
    },
  },
  transformResponse: async (response: Response, params?: RedtailReadParams) => {
    if (!response.ok) {
      const errorText = await response.text()
      logger.error(
        `Redtail account API error: ${response.status} ${response.statusText}`,
        errorText
      )
      throw new Error(
        `Failed to read Redtail account: ${response.status} ${response.statusText} - ${errorText}`
      )
    }

    const data = await response.json()

    if (!data) {
      return {
        success: false,
        output: {
          metadata: {
            operation: 'read_account' as const,
            contactId: params?.contactId,
            itemType: 'account' as const,
          },
        },
      }
    }

    // Handle accounts response
    if (data.accounts) {
      const accounts = Array.isArray(data.accounts) ? data.accounts : [data.accounts]
      
      return {
        success: true,
        output: {
          accounts,
          meta: data.meta, // Include pagination info
          metadata: {
            operation: 'read_account' as const,
            contactId: params?.contactId,
            itemType: 'account' as const,
          },
        },
      }
    }

    // Handle single account response (unlikely but possible)
    if (data.account) {
      return {
        success: true,
        output: {
          account: data.account,
          metadata: {
            operation: 'read_account' as const,
            itemId: data.account.id,
            contactId: params?.contactId,
            itemType: 'account' as const,
          },
        },
      }
    }

    // Fallback for unexpected response structure
    return {
      success: true,
      output: {
        accounts: [data],
        metadata: {
          operation: 'read_account' as const,
          contactId: params?.contactId,
          itemType: 'account' as const,
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

    return 'An error occurred while reading Redtail account'
  },
}

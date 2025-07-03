import { createLogger } from '@/lib/logs/console-logger'
import { env } from '@/lib/env'
import type { ToolConfig } from '../types'
import type { RedtailResponse, RedtailReadParams } from './types'

const logger = createLogger('RedtailReadNote')

export const redtailReadNoteTool: ToolConfig<RedtailReadParams, RedtailResponse> = {
  id: 'redtail_read_note',
  name: 'Read Redtail Note',
  description: 'Read content from a Redtail note',
  version: '1.0.0',
  params: {
    // accessToken: {
    //   type: 'string',
    //   required: true,
    //   description: 'The access token for the Redtail API',
    // },
    contactId: {
      type: 'dropdown',
      required: true,
      description: 'The ID of the contact whose notes to read',
    },
  },
  request: {
    url: (params) => {
      const contactId = params.contactId
      if (!contactId) {
        throw new Error('Contact ID is required')
      }
        return `https://review.crm.redtailtechnology.com/api/public/v1/contacts/${contactId}/notes`
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
        Authorization: `UserKeyAuth ${encodedCredentials}`,
        'Content-Type': 'application/json',
      }
    },
  },
  transformResponse: async (response: Response, params?: RedtailReadParams) => {
    if (!response.ok) {
      const errorText = await response.text()
      logger.error(
        `Redtail notes API error: ${response.status} ${response.statusText}`,
        errorText
      )
      throw new Error(
        `Failed to read Redtail note: ${response.status} ${response.statusText} - ${errorText}`
      )
    }

    const data = await response.json()

    if (!data) {
      return {
        success: false,
        output: {
          metadata: {
            operation: 'read_note' as const,
            itemId: params?.noteId,
            contactId: params?.contactId,
            itemType: 'note' as const,
          },
        },
      }
    }

    // Handle both single note and multiple notes responses
    if (data.notes) {
      // Multiple notes response (when noteId not specified)
      const notes = Array.isArray(data.notes) ? data.notes : [data.notes]
      
      return {
        success: true,
        output: {
          notes,
          metadata: {
            operation: 'read_note' as const,
            contactId: params?.contactId,
            itemType: 'note' as const,
          },
        },
      }
    } else if (data.note) {
      // Single note response
      return {
        success: true,
        output: {
          note: data.note,
          metadata: {
            operation: 'read_note' as const,
            itemId: data.note.id,
            contactId: params?.contactId,
            itemType: 'note' as const,
          },
        },
      }
    }

    // Fallback for unexpected response structure
    return {
      success: true,
      output: {
        note: data,
        metadata: {
          operation: 'read_note' as const,
          itemId: params?.noteId,
          contactId: params?.contactId,
          itemType: 'note' as const,
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

    return 'An error occurred while reading Redtail note'
  },
}
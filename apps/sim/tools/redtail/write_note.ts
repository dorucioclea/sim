import { createLogger } from '@/lib/logs/console-logger'
import { env } from '@/lib/env'
import type { ToolConfig } from '../types'
import type { RedtailResponse, RedtailWriteParams } from './types'

const logger = createLogger('RedtailWriteNote')

export const redtailWriteNoteTool: ToolConfig<RedtailWriteParams, RedtailResponse> = {
  id: 'redtail_write_note',
  name: 'Write Redtail Note',
  description: 'Create a new note in Redtail CRM',
  version: '1.0.0',
  params: {
    contactId: {
      type: 'dropdown',
      required: true,
      description: 'The ID of the contact to create a note for',
    },
    contactNote: {
      type: 'long-input',
      required: true,
      description: 'The note body',
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
    method: 'POST',
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
    body: (params) => {
      return {
        body: params.contactNote,
        category_id: 2,
        note_type: 1,
        pinned: false,
        draft: false,
      }
    },
  },
  transformResponse: async (response: Response, params?: RedtailWriteParams) => {
    if (!response.ok) {
      const errorText = await response.text()
      logger.error(
        `Redtail write note API error: ${response.status} ${response.statusText}`,
        errorText
      )
      throw new Error(
        `Failed to write Redtail note: ${response.status} ${response.statusText} - ${errorText}`
      )
    }

    const data = await response.json()

    if (!data) {
      return {
        success: false,
        output: {
          metadata: {
            operation: 'write_note' as const,
            contactId: params?.contactId,
            itemType: 'note' as const,
          },
        },
      }
    }

    // Handle successful note creation
    if (data.note) {
      return {
        success: true,
        output: {
          note: data.note,
          metadata: {
            operation: 'write_note' as const,
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
          operation: 'write_note' as const,
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

    return 'An error occurred while writing Redtail note'
  },
}

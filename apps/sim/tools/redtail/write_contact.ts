import { createLogger } from '@/lib/logs/console-logger'
import { env } from '@/lib/env'
import type { ToolConfig } from '../types'
import type { RedtailResponse, RedtailWriteParams } from './types'

const logger = createLogger('RedtailWriteContact')

// Helper function to get auth headers
const getAuthHeaders = () => {
  const apiKey = env.REDTAIL_API_KEY
  const userKey = env.REDTAIL_USER_KEY
  
  if (!apiKey || !userKey) {
    throw new Error('Redtail credentials not configured')
  }
  
  const credentials = `${apiKey}:${userKey}`
  const encodedCredentials = Buffer.from(credentials).toString('base64')
  
  return {
    'Authorization': `Userkeyauth ${encodedCredentials}`,
    'Content-Type': 'application/json',
  }
}

// Helper function to add email to contact
const addEmailToContact = async (contactId: number, emailAddress: string) => {
  const url = `https://review.crm.redtailtechnology.com/api/public/v1/contacts/${contactId}/emails`
  
  const response = await fetch(url, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      address: emailAddress,
      email_type: 'Personal', // Default type, can be made configurable later
      primary: true, // Default to primary
    }),
  })
  
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`HTTP ${response.status}: ${errorText}`)
  }
  
  return response.json()
}

// Helper function to parse phone number and extract country code
const parsePhoneNumber = (phoneNumber: string) => {
  const cleaned = phoneNumber.trim()
  
  if (cleaned.startsWith('+')) {
    // Extract country code (1-3 digits after +)
    const match = cleaned.match(/^\+(\d{1,3})(.+)$/)
    if (match) {
      return {
        countryCode: match[1],
        number: match[2].replace(/\D/g, ''), // Remove non-digits from number
      }
    }
  }
  
  // Default to US (+1) if no country code provided
  return {
    countryCode: '1',
    number: cleaned.replace(/\D/g, ''), // Remove non-digits
  }
}

// Helper function to add phone to contact
const addPhoneToContact = async (contactId: number, phoneNumber: string) => {
  const url = `https://review.crm.redtailtechnology.com/api/public/v1/contacts/${contactId}/phones`
  
  const { countryCode, number } = parsePhoneNumber(phoneNumber)
  
  const response = await fetch(url, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      number: number,
      country_code: countryCode,
      phone_type: 'Mobile', // Default type, can be made configurable later
      primary: true, // Default to primary
    }),
  })
  
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`HTTP ${response.status}: ${errorText}`)
  }
  
  return response.json()
}

// Helper function to add note to contact
const addNoteToContact = async (contactId: number, noteBody: string) => {
  const url = `https://review.crm.redtailtechnology.com/api/public/v1/contacts/${contactId}/notes`
  
  const response = await fetch(url, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      body: noteBody,
      category_id: 2, // Default category
      note_type: 1, // Default type
      pinned: false,
      draft: false,
    }),
  })
  
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`HTTP ${response.status}: ${errorText}`)
  }
  
  return response.json()
}

export const redtailWriteContactTool: ToolConfig<RedtailWriteParams, RedtailResponse> = {
  id: 'redtail_write_contact',
  name: 'Write Redtail Contact',
  description: 'Create a new contact in Redtail CRM',
  version: '1.0.0',
  params: {
    firstName: {
      type: 'input',
      required: true,
      description: 'First name of the contact',
    },
    lastName: {
      type: 'input',
      required: true,
      description: 'Last name of the contact',
    },
    contactEmailAddress: {
      type: 'input',
      required: false,
      description: 'Email address of the contact',
    },
    contactPhoneNumber: {
      type: 'input',
      required: false,
      description: 'Phone number of the contact',
    },
    middleName: {
      type: 'input',
      required: false,
      description: 'Middle name of the contact',
    },
    taxId: {
      type: 'input',
      required: false,
      description: 'Tax ID/SSN of the contact',
    },
    dateOfBirth: {
      type: 'input',
      required: false,
      description: 'Date of birth (YYYY-MM-DD format)',
    },
    sourceId: {
      type: 'input',
      required: false,
      description: 'Source ID (default: 2)',
    },
    statusId: {
      type: 'input',
      required: false,
      description: 'Status ID (default: 2)',
    },
    categoryId: {
      type: 'input',
      required: false,
      description: 'Category ID (default: 5)',
    },
    contactNote: {
      type: 'long-input',
      required: false,
      description: 'Optional note to attach to the contact',
    },
  },
  request: {
    url: () => {
      return 'https://review.crm.redtailtechnology.com/api/public/v1/contacts'
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
      // Validate required fields
      if (!params.firstName || params.firstName.trim() === '') {
        throw new Error('First name is required')
      }
      if (!params.lastName || params.lastName.trim() === '') {
        throw new Error('Last name is required')
      }

      // Build the request body with required and optional fields
      const requestBody: any = {
        type: 'Crm::Contact::Individual', // Fixed value for individual contacts
        source_id: params.sourceId || 2,
        source: 'Internet Advertisement', // Default source
        status_id: params.statusId || 2,
        category_id: params.categoryId || 5,
        first_name: params.firstName.trim(),
        last_name: params.lastName.trim(),
      }

      // Add optional fields if provided
      if (params.middleName && params.middleName.trim() !== '') {
        requestBody.middle_name = params.middleName.trim()
      }

      if (params.taxId && params.taxId.trim() !== '') {
        requestBody.tax_id = params.taxId.trim()
      }

      if (params.dateOfBirth && params.dateOfBirth.trim() !== '') {
        // Validate date format (YYYY-MM-DD)
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/
        if (!dateRegex.test(params.dateOfBirth)) {
          throw new Error('Date of birth must be in YYYY-MM-DD format')
        }
        requestBody.dob = params.dateOfBirth.trim()
      }

      logger.info('Redtail write contact request body', requestBody)
      return requestBody
    },
  },
  transformResponse: async (response: Response, params?: RedtailWriteParams) => {
    if (!response.ok) {
      const errorText = await response.text()
      logger.error(
        `Redtail write contact API error: ${response.status} ${response.statusText}`,
        errorText
      )
      throw new Error(
        `Failed to write Redtail contact: ${response.status} ${response.statusText} - ${errorText}`
      )
    }

    const data = await response.json()

    if (!data) {
      return {
        success: false,
        output: {
          metadata: {
            operation: 'write_contact' as const,
            itemType: 'contact' as const,
          },
        },
      }
    }

    // Extract contact info and ID
    let contact = data.contact || data
    let contactId = contact.id

    if (!contactId) {
      throw new Error('Failed to get contact ID from response')
    }

    logger.info(`Contact created successfully with ID: ${contactId}`)

    // Store any warnings for partial failures
    const warnings: string[] = []

    // Add email if provided
    if (params?.contactEmailAddress && params.contactEmailAddress.trim() !== '') {
      try {
        await addEmailToContact(contactId, params.contactEmailAddress.trim())
        logger.info(`Email added successfully to contact ${contactId}`)
      } catch (error) {
        const errorMsg = `Failed to add email to contact: ${error instanceof Error ? error.message : String(error)}`
        logger.error(errorMsg)
        warnings.push(errorMsg)
      }
    }

    // Add phone if provided
    if (params?.contactPhoneNumber && params.contactPhoneNumber.trim() !== '') {
      try {
        await addPhoneToContact(contactId, params.contactPhoneNumber.trim())
        logger.info(`Phone added successfully to contact ${contactId}`)
      } catch (error) {
        const errorMsg = `Failed to add phone to contact: ${error instanceof Error ? error.message : String(error)}`
        logger.error(errorMsg)
        warnings.push(errorMsg)
      }
    }

    // Add note if provided (we can reuse existing note logic)
    if (params?.contactNote && params.contactNote.trim() !== '') {
      try {
        await addNoteToContact(contactId, params.contactNote.trim())
        logger.info(`Note added successfully to contact ${contactId}`)
      } catch (error) {
        const errorMsg = `Failed to add note to contact: ${error instanceof Error ? error.message : String(error)}`
        logger.error(errorMsg)
        warnings.push(errorMsg)
      }
    }

    return {
      success: true,
      output: {
        contact,
        warnings: warnings.length > 0 ? warnings : undefined,
        metadata: {
          operation: 'write_contact' as const,
          itemId: contactId,
          contactId: contactId,
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

    return 'An error occurred while writing Redtail contact'
  },
}

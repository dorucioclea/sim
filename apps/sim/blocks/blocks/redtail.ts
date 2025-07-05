import { RedtailIcon } from '@/components/icons'
import type { RedtailResponse } from '@/tools/redtail/types'
import type { BlockConfig } from '../types'

export const RedtailBlock: BlockConfig<RedtailResponse> = {
  type: 'redtail',
  name: 'Redtail',
  description: 'Interact with Redtail CRM',
  longDescription:
    'Integrate Redtail CRM functionality to manage notes, contacts, and accounts. Read and write content from existing notes and contacts, and read financial account information using OAuth authentication. Supports comprehensive CRM operations for financial advisory workflows.',
  docsLink: 'https://docs.simstudio.ai/tools/redtail',
  category: 'tools',
  bgColor: '#E0E0E0',
  icon: RedtailIcon,
  subBlocks: [
    {
      id: 'operation',
      title: 'Operation',
      type: 'dropdown',
      layout: 'full',
      options: [
        { label: 'Read Note', id: 'read_note' },
        { label: 'Write Note', id: 'write_note' },
        { label: 'Read Contact', id: 'read_contact' },
        { label: 'Write Contact', id: 'write_contact' },
        { label: 'Read Account', id: 'read_account' },
      ],
    },
    {
      id: 'credential',
      title: 'Redtail Account',
      type: 'oauth-input',
      layout: 'full',
      provider: 'redtail',
      serviceId: 'redtail',
      requiredScopes: [],
      placeholder: 'Select Redtail account',
    },
    {
      id: 'contactId',
      title: 'Select Contact',
      type: 'file-selector',
      layout: 'full',
      provider: 'redtail',
      serviceId: 'redtail',
      requiredScopes: [],
      placeholder: 'Search and select a contact',
      condition: { field: 'operation', value: ['read_contact', 'read_account', 'read_note', 'write_note'] },
    },
    {
      id: 'firstName',
      title: 'First Name',
      type: 'short-input',
      layout: 'full',
      placeholder: 'Enter First Name',
      condition: { field: 'operation', value: ['write_contact'] },
    },
    {
      id: 'lastName',
      title: 'Last Name',
      type: 'short-input',
      layout: 'full',
      placeholder: 'Enter Last Name',
      condition: { field: 'operation', value: ['write_contact'] },
    },
    {
      id: 'contactEmailAddress',
      title: 'Email Address',
      type: 'short-input',
      layout: 'full',
      placeholder: 'Enter Email Address',
      condition: { field: 'operation', value: ['write_contact'] },
    },
    {
        id: 'contactPhoneNumber',
        title: 'Phone Number',
        type: 'short-input',
        layout: 'full',
        placeholder: 'Enter Phone Number',
        condition: { field: 'operation', value: ['write_contact'] },
    },
    {
      id: 'contactNote',
      title: 'Contact Note',
      type: 'long-input',
      layout: 'full',
      placeholder: 'Enter Contact Note',
      condition: { field: 'operation', value: ['write_contact', 'write_note'] },
    },
  ],
  tools: {
    access: [
      'redtail_read_note',
      'redtail_write_note',
      'redtail_read_contact',
      'redtail_write_contact',
      'redtail_read_account',
    ],
    config: {
      tool: (params) => {
        switch (params.operation) {
          case 'read_note':
            return 'redtail_read_note'
          case 'write_note':
            return 'redtail_write_note'
          case 'read_contact':
            return 'redtail_read_contact'
          case 'write_contact':
            return 'redtail_write_contact'
          case 'read_account':
            return 'redtail_read_account'
          default:
            throw new Error(`Unknown operation: ${params.operation}`)
        }
      },
      params: (params) => {
        // const { credential, operation, ...rest } = params
        const { operation, ...rest } = params

        // Build the parameters based on operation type
        const baseParams = {
          ...rest,
          // accessToken: credential,
          operation,
        }

        // Validate required parameters based on operation
        switch (operation) {
          case 'read_note':
          case 'write_note':
            if (!params.noteId) {
              throw new Error('Note ID is required for note operations')
            }
            break

          case 'read_contact':
          case 'write_contact':
            if (!params.contactId) {
              throw new Error('Contact ID is required for contact operations')
            }
            break

          case 'read_account':
            if (!params.contactId) {
              throw new Error('Contact ID is required for account operations')
            }
            break
        }

        return baseParams
      },
    },
  },
  inputs: {
    operation: { type: 'string', required: true },
    // credential: { type: 'string', required: true },
    noteId: { type: 'number', required: false },
    contactId: { type: 'number', required: false },
    firstName: { type: 'string', required: false },
    lastName: { type: 'string', required: false },
    contactEmailAddress: { type: 'string', required: false },
    contactNote: { type: 'string', required: false },
  },
  outputs: {
    response: {
      type: {
        metadata: 'json',
        success: 'any'
      },
    },
  },
}
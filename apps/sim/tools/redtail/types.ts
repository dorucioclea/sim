import type { ToolResponse } from '../types'

export type RedtailOperation = 'read_note' | 'write_note' | 'read_contact' | 'write_contact' | 'read_account'
export type RedtailEntityType = 'note' | 'contact' | 'account'

export interface RedtailNoteAssociation {
  id: number
  note_id: number
  noteable_id: number
  noteable_type: string
  deleted: boolean
  created_at: string
  updated_at: string
}

export interface RedtailNote {
  id: number
  category_id: number
  category: string
  note_type: number
  note_type_description: string
  pinned: boolean
  draft: boolean
  added_by: number
  body: string
  deleted: boolean
  created_at: string
  updated_at: string
  note_associations: RedtailNoteAssociation[]
}

export interface RedtailContactAddress {
  id: number
  address_type: string
  street_address: string
  city: string
  state: string
  zip_code: string
  country?: string
}

export interface RedtailContactPhone {
  id: number
  phone_type: string
  number: string
  extension?: string
  primary: boolean
}

export interface RedtailContactEmail {
  id: number
  email_type: string
  address: string
  primary: boolean
}

export interface RedtailContactUrl {
  id: number
  url_type: string
  address: string
}

export interface RedtailContact {
  id: number
  type: string
  salutation_id?: number
  salutation?: string
  source_id?: number
  source?: string
  status_id?: number
  status?: string
  category_id?: number
  category?: string
  gender?: string
  suffix?: string
  first_name: string
  middle_name?: string
  last_name: string
  full_name?: string
  nickname?: string
  tax_id?: string
  dob?: string // Date of birth
  death_date?: string | null
  marital_status?: string
  company_name?: string | null
  designation?: string
  servicing_advisor_id?: number
  servicing_advisor?: string
  writing_advisor_id?: number
  writing_advisor?: string
  created_at: string
  updated_at: string

  addresses?: RedtailContactAddress[]
  phones?: RedtailContactPhone[]
  emails?: RedtailContactEmail[]
  urls?: RedtailContactUrl[]
}

export interface RedtailAccount {
  id: number
  contact_id: number
  account_type_id: number
  account_type: string
  status: number
  number: string
  company: string
  product: string
  taxqualified: boolean
  taxqualified_type: number | null
  deleted: boolean
  created_at: string
  updated_at: string
}

export interface RedtailApiMeta {
  total_records: number
  total_pages: number
}

export interface RedtailToolMetadata {
  operation: RedtailOperation
  itemId?: number
  contactId?: number
  itemType: RedtailEntityType
}

export interface RedtailOutput {
  note?: RedtailNote
  contact?: RedtailContact
  account?: RedtailAccount
  notes?: RedtailNote[]
  contacts?: RedtailContact[]
  accounts?: RedtailAccount[]
  meta?: RedtailApiMeta
  success?: boolean
  warnings?: string[]
  metadata: RedtailToolMetadata
}

export interface RedtailResponse extends ToolResponse {
  output: RedtailOutput
}

export interface RedtailReadParams {
  operation: Extract<RedtailOperation, 'read_note' | 'read_contact' | 'read_account'>
  noteId?: number        
  contactId?: number
  accountId?: number
  include?: string
  recentlyViewed?: boolean
  page?: number
  includeAssets?: boolean
}

export interface RedtailWriteParams {
  operation: Extract<RedtailOperation, 'write_note' | 'write_contact'>
  contactId?: number
  contactNote?: string
  noteAssociations?: Array<{ noteable_id: number; noteable_type: string }>
  // Write contact parameters
  firstName?: string
  lastName?: string
  contactEmailAddress?: string
  contactPhoneNumber?: string
  middleName?: string
  taxId?: string
  dateOfBirth?: string
  sourceId?: number
  statusId?: number
  categoryId?: number
}
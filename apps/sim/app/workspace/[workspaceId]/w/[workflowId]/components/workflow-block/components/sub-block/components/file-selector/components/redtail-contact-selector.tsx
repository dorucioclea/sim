'use client'

import { useCallback, useEffect, useState, useRef } from 'react'
import { Check, ChevronDown, RefreshCw, X } from 'lucide-react'
import { RedtailIcon } from '@/components/icons'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { createLogger } from '@/lib/logs/console-logger'

const logger = createLogger('RedtailContactSelector')

export interface RedtailContactInfo {
  id: string
  label: string
  value: string
  email?: string
  phone?: string
}

interface RedtailContactSelectorProps {
  value: string
  onChange: (contactId: string, contact?: RedtailContactInfo) => void
  label?: string
  disabled?: boolean
  showPreview?: boolean
  onContactInfoChange?: (contact: RedtailContactInfo | null) => void
}

export function RedtailContactSelector({
  value,
  onChange,
  label = 'Select contact',
  disabled = false,
  showPreview = true,
  onContactInfoChange,
}: RedtailContactSelectorProps) {
  const [open, setOpen] = useState(false)
  const [selectedContactId, setSelectedContactId] = useState(value)
  const [selectedContact, setSelectedContact] = useState<RedtailContactInfo | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingContacts, setIsLoadingContacts] = useState(false)
  const [availableContacts, setAvailableContacts] = useState<RedtailContactInfo[]>([])

  // Direct timeout-based debouncing
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Fetch available contacts from our API endpoint
  const fetchAvailableContacts = useCallback(async (searchQuery?: string) => {
    setIsLoadingContacts(true)
    
    try {
      const queryParams = new URLSearchParams()
      
      if (searchQuery?.trim()) {
        queryParams.append('q', searchQuery.trim())
      }
      
      const response = await fetch(`/api/tools/redtail/contacts/search?${queryParams.toString()}`)

      if (response.ok) {
        const data = await response.json()
        setAvailableContacts(data.options || [])
      } else {
        logger.error('Error fetching available contacts:', {
          error: await response.text(),
        })
        setAvailableContacts([])
      }
    } catch (error) {
      logger.error('Error fetching available contacts:', { error })
      setAvailableContacts([])
    } finally {
      setIsLoadingContacts(false)
    }
  }, [])

  // Fetch a single contact by ID (if needed for display purposes)
  const fetchContactById = useCallback(
    async (contactId: string) => {
      if (!contactId) return null

      setIsLoading(true)
      try {
        // For now, we'll just use the contactId as is since we don't have a single contact endpoint
        // In a real implementation, you might want to add an endpoint for fetching single contacts
        const contact: RedtailContactInfo = {
          id: contactId,
          label: `Contact ${contactId}`,
          value: contactId,
        }
        
        setSelectedContact(contact)
        onContactInfoChange?.(contact)
        return contact
      } catch (error) {
        logger.error('Error fetching contact by ID:', { error })
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [onContactInfoChange]
  )

  // Fetch the selected contact metadata when value changes
  useEffect(() => {
    if (value && !selectedContact) {
      fetchContactById(value)
    }
  }, [value, selectedContact, fetchContactById])

  // Keep internal selectedContactId in sync with the value prop
  useEffect(() => {
    if (value !== selectedContactId) {
      setSelectedContactId(value)
    }
  }, [value])

  // Handle selecting a contact from the available contacts
  const handleContactSelect = (contact: RedtailContactInfo) => {
    setSelectedContactId(contact.id)
    setSelectedContact(contact)
    onChange(contact.id, contact)
    onContactInfoChange?.(contact)
    setOpen(false)
    // setSearchQuery('') // Clear search when contact is selected
  }

  // Clear selection
  const handleClearSelection = () => {
    setSelectedContactId('')
    setSelectedContact(null)
    onChange('', undefined)
    onContactInfoChange?.(null)
  }

  // Handle search input changes
  const handleSearch = (value: string) => {    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    // Set a new timeout
    searchTimeoutRef.current = setTimeout(() => {
      fetchAvailableContacts(value)
    }, 300)
  }

  // Handle popover open state
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (isOpen) {
      fetchAvailableContacts()
    }
  }

  // Add cleanup for timeout
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [])

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant='outline'
          role='combobox'
          aria-expanded={open}
          className='w-full justify-between'
          disabled={disabled}
        >
          <div className='flex items-center gap-2 overflow-hidden'>
            <RedtailIcon className='h-4 w-4 shrink-0' />
            {selectedContact ? (
              <span className='truncate'>{selectedContact.label}</span>
            ) : (
              <span className='text-muted-foreground'>{label}</span>
            )}
          </div>
          <div className='flex items-center gap-1'>
            {selectedContact && (
              <X
                className='h-4 w-4 text-muted-foreground hover:text-foreground'
                onClick={(e) => {
                  e.stopPropagation()
                  handleClearSelection()
                }}
              />
            )}
            <ChevronDown className='h-4 w-4 shrink-0 opacity-50' />
          </div>
        </Button>
      </PopoverTrigger>

      <PopoverContent className='w-[300px] p-0' align='start'>
        <Command>
          <CommandInput
            placeholder='Search contacts...'
            onValueChange={handleSearch}
          />
          <CommandList>
            {isLoadingContacts && (
              <div className='flex items-center justify-center p-4'>
                <RefreshCw className='h-4 w-4 animate-spin' />
                <span className='ml-2 text-sm'>Loading contacts...</span>
              </div>
            )}

            {!isLoadingContacts && availableContacts.length === 0 && (
              <CommandEmpty>No contacts found.</CommandEmpty>
            )}

            {!isLoadingContacts && availableContacts.length === 0 && (
              <CommandEmpty>Start typing to search contacts...</CommandEmpty>
            )}

            {/* Available contacts */}
            {availableContacts.length > 0 && (
              <CommandGroup>
                <div className='px-2 py-1.5 font-medium text-muted-foreground text-xs'>
                  Contacts
                </div>
                {availableContacts.map((contact) => (
                  <CommandItem
                    key={contact.id}
                    value={`contact-${contact.id}-${contact.label}`}
                    onSelect={() => handleContactSelect(contact)}
                  >
                    <div className='flex items-center gap-2 overflow-hidden'>
                      <RedtailIcon className='h-4 w-4 shrink-0' />
                      <div className='min-w-0 flex-1'>
                        <span className='truncate font-normal'>{contact.label}</span>
                        {contact.email && (
                          <div className='text-muted-foreground text-xs'>
                            {contact.email}
                          </div>
                        )}
                      </div>
                    </div>
                    {contact.id === selectedContactId && <Check className='ml-auto h-4 w-4' />}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
} 
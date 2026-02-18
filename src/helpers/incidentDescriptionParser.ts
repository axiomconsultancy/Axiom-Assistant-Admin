/**
 * Utility to parse incident description text into structured sections
 */

export interface IncidentSection {
    header: string
    content: string
    icon?: string
    variant?: 'primary' | 'danger' | 'warning' | 'info' | 'success' | 'secondary'
}

/**
 * Parses a raw incident description and extracts meaningful sections
 */
export function parseIncidentDescription(description: string): IncidentSection[] {
    if (!description || description.trim().length === 0) {
        return []
    }

    const sections: IncidentSection[] = []

    // Define section patterns with their configurations
    // Only include sections the user wants to see
    const sectionPatterns = [
        {
            pattern: /Summary:\s*([\s\S]*?)(?=\n[A-Z][a-z\s]+:|$)/,
            header: 'Summary',
            icon: 'solar:document-text-bold',
            variant: 'primary' as const
        },
        {
            pattern: /Timeline of the Call:\s*([\s\S]*?)(?=\n[A-Z][a-z\s]+:|$)/,
            header: 'Timeline',
            icon: 'solar:clock-circle-bold',
            variant: 'info' as const
        },
        {
            pattern: /Agent Actions & Responses:\s*([\s\S]*?)(?=\n[A-Z][a-z\s]+:|$)/,
            header: 'Agent Actions',
            icon: 'solar:chat-round-line-bold',
            variant: 'secondary' as const
        },
        {
            pattern: /Caller Behavior & Concerns:\s*([\s\S]*?)(?=\n[A-Z][a-z\s]+:|$)/,
            header: 'Caller Behavior',
            icon: 'solar:user-speak-bold',
            variant: 'warning' as const
        },
        {
            pattern: /Information Collected:\s*([\s\S]*?)(?=\n[A-Z][a-z\s]+:|$)/,
            header: 'Information Collected',
            icon: 'solar:clipboard-list-bold',
            variant: 'success' as const
        },
        {
            pattern: /Escalation Status:\s*([\s\S]*?)(?=\n[A-Z][a-z\s]+:|$)/,
            header: 'Escalation',
            icon: 'solar:arrow-up-bold',
            variant: 'warning' as const
        },
        {
            pattern: /Outcome of the Call:\s*([\s\S]*?)(?=\n[A-Z][a-z\s]+:|$)/,
            header: 'Outcome',
            icon: 'solar:check-circle-bold',
            variant: 'success' as const
        },
        {
            pattern: /Pending Actions & Next Steps:\s*([\s\S]*?)(?=\n[A-Z][a-z\s]+:|$)/,
            header: 'Next Steps',
            icon: 'solar:list-check-bold',
            variant: 'warning' as const
        },
        {
            pattern: /Risk \/ Severity Assessment:\s*([\s\S]*?)(?=\n[A-Z][a-z\s]+:|$)/,
            header: 'Risk Assessment',
            icon: 'solar:shield-warning-bold',
            variant: 'danger' as const
        },
        {
            pattern: /Notes & Observations:\s*([\s\S]*?)(?=\n[A-Z][a-z\s]+:|$)/,
            header: 'Notes',
            icon: 'solar:notes-bold',
            variant: 'secondary' as const
        }
    ]

    // Also handle variations with different separators
    const alternativePatterns = [
        {
            pattern: /Key Details:\s*([\s\S]*?)(?=\n[A-Z][a-z\s]+:|$)/,
            header: 'Key Details',
            icon: 'solar:info-circle-bold',
            variant: 'primary' as const
        },
        {
            pattern: /Outcome & Next Steps:\s*([\s\S]*?)(?=\n[A-Z][a-z\s]+:|$)/,
            header: 'Outcome & Next Steps',
            icon: 'solar:arrow-right-bold',
            variant: 'success' as const
        }
    ]

    // Try to extract all sections
    for (const { pattern, header, icon, variant } of [...sectionPatterns, ...alternativePatterns]) {
        const match = description.match(pattern)
        if (match && match[1]) {
            const content = match[1].trim()
            if (content.length > 0) {
                // Check if we already have this header
                const existingIndex = sections.findIndex(s => s.header === header)
                if (existingIndex === -1) {
                    sections.push({ header, content, icon, variant })
                } else {
                    // Merge content if it's longer
                    if (content.length > sections[existingIndex].content.length) {
                        sections[existingIndex].content = content
                    }
                }
            }
        }
    }

    // If no structured sections found, return the entire description as a single section
    if (sections.length === 0) {
        sections.push({
            header: 'Incident Description',
            content: description.trim(),
            icon: 'solar:document-text-bold',
            variant: 'primary'
        })
    }

    return sections
}

/**
 * Extract key-value pairs from a section content
 */
export function extractKeyValuePairs(content: string): Array<{ key: string; value: string }> {
    const pairs: Array<{ key: string; value: string }> = []

    // Match patterns like "Key: Value" or "Key - Value"
    const lines = content.split('\n')

    for (const line of lines) {
        const colonMatch = line.match(/^([^:]+):\s*(.+)$/)
        if (colonMatch) {
            pairs.push({
                key: colonMatch[1].trim(),
                value: colonMatch[2].trim()
            })
            continue
        }

        const dashMatch = line.match(/^([^-]+)\s*-\s*(.+)$/)
        if (dashMatch) {
            pairs.push({
                key: dashMatch[1].trim(),
                value: dashMatch[2].trim()
            })
        }
    }

    return pairs
}

/**
 * Format section content for better readability
 */
export function formatSectionContent(content: string): string {
    // Clean up excessive whitespace
    let formatted = content.replace(/\n{3,}/g, '\n\n')

    // Ensure bullet points are properly formatted
    formatted = formatted.replace(/^-\s*/gm, '• ')

    return formatted.trim()
}

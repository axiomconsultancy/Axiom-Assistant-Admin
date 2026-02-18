import React from 'react'
import { parseIncidentDescription, formatSectionContent } from '@/helpers/incidentDescriptionParser'

interface IncidentDescriptionViewerProps {
    description: string
    className?: string
}

export const IncidentDescriptionViewer: React.FC<IncidentDescriptionViewerProps> = ({
    description,
    className = ''
}) => {
    const sections = parseIncidentDescription(description)

    if (sections.length === 0) {
        return (
            <div className={`text-muted fst-italic ${className}`}>
                No description available
            </div>
        )
    }

    return (
        <div className={className}>
            {sections.map((section, index) => {
                const formattedContent = formatSectionContent(section.content)

                return (
                    <div key={index} className={index > 0 ? 'mt-3' : ''}>
                        <small className="text-muted d-block mb-1">{section.header}</small>
                        <div
                            className="p-3 bg-light rounded"
                            style={{
                                fontSize: '0.9rem',
                                lineHeight: '1.6',
                                whiteSpace: 'pre-wrap'
                            }}
                        >
                            {formattedContent}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

interface CompactIncidentDescriptionProps {
    description: string
    maxSections?: number
    className?: string
}

export const CompactIncidentDescription: React.FC<CompactIncidentDescriptionProps> = ({
    description,
    maxSections = 3,
    className = ''
}) => {
    const sections = parseIncidentDescription(description)
    const displaySections = sections.slice(0, maxSections)

    if (sections.length === 0) {
        return (
            <div className={`text-muted fst-italic small ${className}`}>
                No description available
            </div>
        )
    }

    return (
        <div className={`d-flex flex-column gap-2 ${className}`}>
            {displaySections.map((section, index) => (
                <div key={index}>
                    <div className="fw-semibold mb-1" style={{ fontSize: '0.85rem' }}>
                        {section.header}
                    </div>
                    <div
                        className="text-muted text-truncate"
                        style={{ fontSize: '0.8rem', maxWidth: '100%' }}
                        title={section.content}
                    >
                        {section.content.substring(0, 100)}
                        {section.content.length > 100 ? '...' : ''}
                    </div>
                </div>
            ))}
            {sections.length > maxSections && (
                <small className="text-muted fst-italic">
                    +{sections.length - maxSections} more section{sections.length - maxSections !== 1 ? 's' : ''}
                </small>
            )}
        </div>
    )
}

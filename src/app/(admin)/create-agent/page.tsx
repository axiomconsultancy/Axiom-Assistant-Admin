'use client'

import React, { useState } from 'react'
import { Button, Card, CardBody, CardHeader, CardTitle, Col, Form, Row } from 'react-bootstrap'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'react-toastify'
import IconifyIcon from '@/components/wrapper/IconifyIcon'
import { useAuth } from '@/context/useAuthContext'
import { adminAgentApi } from '@/lib/admin-agent-api'

type AgentFormState = {
  name: string
  description: string
  language: string
  additionalLanguages: string
  voiceId: string
  model: string
  prompt: string
}

const initialFormState: AgentFormState = {
  name: '',
  description: '',
  language: 'en',
  additionalLanguages: '',
  voiceId: '',
  model: '',
  prompt: ''
}

const CreateAgentPage = () => {
  const { token, isAuthenticated, user, isLoading } = useAuth()
  const router = useRouter()
  const [formData, setFormData] = useState<AgentFormState>(initialFormState)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  const handleInputChange = (field: keyof AgentFormState) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData((prev) => ({
      ...prev,
      [field]: event.target.value
    }))
    setFormErrors((prev) => ({ ...prev, [field]: '' }))
  }

  const validateForm = () => {
    const errors: Record<string, string> = {}
    if (!formData.name.trim()) errors.name = 'Agent name is required'
    if (!formData.prompt.trim()) errors.prompt = 'Prompt is required'
    if (!formData.voiceId.trim()) errors.voiceId = 'Voice ID is required'
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleCreateAgent = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!token || !isAuthenticated || user?.role !== 'admin') {
      toast.error('You are not authorized to create agents')
      return
    }
    if (!validateForm()) return

    setSubmitting(true)
    try {
      const additionalLanguages = formData.additionalLanguages
        .split(',')
        .map((lang) => lang.trim())
        .filter(Boolean)

      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        default_language: formData.language.trim() || undefined,
        additional_languages: additionalLanguages.length ? additionalLanguages : undefined,
        tts: {
          voice_id: formData.voiceId.trim()
        },
        conversation_config: {
          agent: {
            name: formData.name.trim(),
            prompt: {
              prompt: formData.prompt.trim(),
              llm: formData.model.trim() || undefined
            }
          }
        }
      }

      const response = await adminAgentApi.createAgent(token, payload)
      if (response.error) {
        toast.error(response.error)
      } else {
        toast.success('Agent created successfully')
        setFormData(initialFormState)
        setTimeout(() => {
          router.push('/agents')
        }, 400)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to create agent')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isAuthenticated && !isLoading) {
    return (
      <Row className="py-5">
        <Col xs={12}>
          <div className="text-center">
            <h4 className="mb-2">Please sign in</h4>
            <p className="text-muted mb-0">You need an admin account to manage agents.</p>
          </div>
        </Col>
      </Row>
    )
  }

  if (user && user.role !== 'admin') {
    return (
      <Row className="py-5">
        <Col xs={12}>
          <div className="text-center">
            <IconifyIcon icon="solar:shield-cross-outline" width={48} height={48} className="text-danger mb-3" />
            <h4 className="mb-2">Access restricted</h4>
            <p className="text-muted mb-0">Only admins can manage agents.</p>
          </div>
        </Col>
      </Row>
    )
  }

  return (
    <>
      <Row>
        <Col xs={12}>
          <div className="page-title-box">
            <h4 className="mb-0">Create Agent</h4>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link href="/">Taplox</Link>
              </li>
              <div className="mx-1" style={{ height: 24, paddingRight: '8px' }}>
                <IconifyIcon icon="bx:chevron-right" height={16} width={16} />
              </div>
              <li className="breadcrumb-item active">Create Agent</li>
            </ol>
          </div>
        </Col>
      </Row>

      <Row className="mt-4">
        <Col xs={12}>
          <Card>
            <CardHeader>
              <CardTitle as="h5">New Agent Configuration</CardTitle>
              <p className="text-muted mb-0">
                Define the core personality, voice, and language settings for your conversational agent.
              </p>
            </CardHeader>
            <CardBody>
              <Form onSubmit={handleCreateAgent}>
                <Row className="g-3">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Agent Name</Form.Label>
                      <Form.Control
                        value={formData.name}
                        onChange={handleInputChange('name')}
                        placeholder="Sales Concierge"
                        isInvalid={!!formErrors.name}
                      />
                      <Form.Control.Feedback type="invalid">{formErrors.name}</Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Primary Language</Form.Label>
                      <Form.Control
                        value={formData.language}
                        onChange={handleInputChange('language')}
                        placeholder="en"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={12}>
                    <Form.Group>
                      <Form.Label>Description</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={2}
                        value={formData.description}
                        onChange={handleInputChange('description')}
                        placeholder="Short description of the agent's responsibilities."
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Additional Languages</Form.Label>
                      <Form.Control
                        value={formData.additionalLanguages}
                        onChange={handleInputChange('additionalLanguages')}
                        placeholder="es, fr, de"
                      />
                      <Form.Text className="text-muted">Comma separated list (optional).</Form.Text>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Voice ID</Form.Label>
                      <Form.Control
                        value={formData.voiceId}
                        onChange={handleInputChange('voiceId')}
                        placeholder="voice_123"
                        isInvalid={!!formErrors.voiceId}
                      />
                      <Form.Control.Feedback type="invalid">{formErrors.voiceId}</Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>LLM Model</Form.Label>
                      <Form.Control
                        value={formData.model}
                        onChange={handleInputChange('model')}
                        placeholder="gpt-4o-mini"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={12}>
                    <Form.Group>
                      <Form.Label>System Prompt</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={4}
                        value={formData.prompt}
                        onChange={handleInputChange('prompt')}
                        placeholder="Describe how the agent should behave..."
                        isInvalid={!!formErrors.prompt}
                      />
                      <Form.Control.Feedback type="invalid">{formErrors.prompt}</Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                  <Col xs={12} className="text-end">
                    <Button type="submit" disabled={submitting}>
                      {submitting ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <IconifyIcon icon="solar:add-square-outline" width={18} height={18} className="me-2" />
                          Create Agent
                        </>
                      )}
                    </Button>
                  </Col>
                </Row>
              </Form>
            </CardBody>
          </Card>
        </Col>
      </Row>

    </>
  )
}

export default CreateAgentPage


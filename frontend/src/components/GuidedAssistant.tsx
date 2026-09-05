import React, { useState } from 'react';
import { PropertyUnit, ValidationSummary, ConfidenceScore } from '../types';
import { MessageSquare, Bot, X, Sparkles, Send } from 'lucide-react';

interface GuidedAssistantProps {
  selectedProperty?: PropertyUnit;
  validation?: ValidationSummary;
  confidence?: ConfidenceScore;
}

interface Message {
  sender: 'bot' | 'user';
  text: string;
}

export const GuidedAssistant: React.FC<GuidedAssistantProps> = ({
  selectedProperty,
  validation,
  confidence
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'bot',
      text: 'Namaste! I am the GeoVISTA Guided Assistant. I can explain the proposed 3D spatial identifiers, verification statuses, and topology validation results using official prototype data.'
    }
  ]);
  const [input, setInput] = useState('');

  const handleSendPrompt = (promptText: string) => {
    const userMsg: Message = { sender: 'user', text: promptText };
    let reply = '';

    if (promptText.includes('3D ID') || promptText.includes('format')) {
      if (selectedProperty) {
        reply = `The identifier "${selectedProperty.proposed_3d_id}" is a Proposed 3D Spatial Identifier (Prototype). Format: [Country]-[State]-[Locality]-[Parcel]-[Building]-[Floor]-[Unit]. For this property, Floor is ${selectedProperty.floor_number} and Unit is ${selectedProperty.unit_number}. Note: This is a prototype scheme and not an official land registration title.`;
      } else {
        reply = 'The proposed 3D identifier scheme formats volumetric properties as [Country]-[State]-[Locality]-[Parcel]-[Building]-[Floor]-[Unit]. Example: IN-MP-BPL-P001-B01-F03-U02. Please select a property to see its specific breakdown.';
      }
    } else if (promptText.includes('status') || promptText.includes('verification')) {
      if (selectedProperty) {
        reply = `The current verification status of this property is "${selectedProperty.verification_status}". ${
          selectedProperty.verification_status === 'APPROVED'
            ? 'An authorized inspection officer has verified the spatial geometry and attached sensor evidence.'
            : selectedProperty.verification_status === 'UNDER_REVIEW'
            ? 'This property is currently undergoing human-in-the-loop review. Some measurements may be subject to survey verification.'
            : 'A spatial or height conflict was detected. An inspection officer must adjust the geometry.'
        }`;
      } else {
        reply = 'Properties transition through states: NOT_YET_VERIFIED -> PENDING_VERIFICATION -> UNDER_REVIEW -> APPROVED / CORRECTION_REQUIRED / REJECTED.';
      }
    } else if (promptText.includes('confidence') || promptText.includes('score')) {
      if (confidence) {
        reply = `The technical confidence score is ${confidence.overall_score}%. Breakdown: Evidence completeness (${confidence.evidence_completeness}%), Geometry quality (${confidence.geometry_quality}%), Positional quality (${confidence.positional_quality}%), Sensor agreement (${confidence.cross_source_agreement}%), and Validation rules (${confidence.validation_score}%). This score measures spatial data consistency and is not a legal title certification.`;
      } else {
        reply = 'The technical confidence score combines 5 weighted parameters (Evidence 25%, Geometry 25%, Position 20%, Agreement 20%, Validation 10%).';
      }
    } else if (promptText.includes('rules') || promptText.includes('validation')) {
      if (validation) {
        reply = `The validation engine evaluated ${validation.total_rules_checked} deterministic topology rules. Passed: ${validation.passed_rules}, Warnings: ${validation.warning_rules}, Failed: ${validation.failed_rules}. Overall topology status is ${validation.overall_status}.`;
      } else {
        reply = 'GeoVISTA enforces 9 deterministic validation rules including Parcel Containment, Height Bounds (Zmin < Zmax), Horizontal Footprint Overlap, and 3D Volumetric Overlap.';
      }
    } else {
      reply = `Thank you for your question. As an evidence-based assistant, I provide answers strictly derived from our cadastral database. You can inspect property geometry, review evidence, or submit an official citizen issue report using the interface.`;
    }

    setMessages((prev) => [...prev, userMsg, { sender: 'bot', text: reply }]);
    setInput('');
  };

  return (
    <div className="fixed bottom-5 right-5 z-40">
      {isOpen ? (
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-84 sm:w-96 h-[480px] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="bg-blue-900 text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-blue-800 flex items-center justify-center">
                <Bot className="w-4 h-4 text-blue-300" />
              </div>
              <div>
                <h4 className="text-xs font-bold">GeoVISTA Guided Assistant</h4>
                <span className="text-[10px] text-blue-200 block">Local Cadastral AI (No Key Required)</span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-blue-200 hover:text-white hover:bg-blue-800 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 p-3 overflow-y-auto space-y-2.5 text-xs">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`p-2.5 rounded-xl max-w-[85%] leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-blue-900 text-white rounded-br-xs'
                      : 'bg-slate-100 text-slate-800 rounded-bl-xs border border-slate-200/60'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
          </div>

          {/* Quick Prompts */}
          <div className="p-2 border-t border-slate-100 bg-slate-50/80 flex flex-wrap gap-1">
            <button
              onClick={() => handleSendPrompt('Explain proposed 3D ID')}
              className="px-2 py-1 rounded bg-white border border-slate-200 text-[10px] font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-900 hover:border-blue-200 transition"
            >
              3D ID Format
            </button>
            <button
              onClick={() => handleSendPrompt('Explain verification status')}
              className="px-2 py-1 rounded bg-white border border-slate-200 text-[10px] font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-900 hover:border-blue-200 transition"
            >
              Verification Status
            </button>
            <button
              onClick={() => handleSendPrompt('Explain confidence score')}
              className="px-2 py-1 rounded bg-white border border-slate-200 text-[10px] font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-900 hover:border-blue-200 transition"
            >
              Confidence Score
            </button>
            <button
              onClick={() => handleSendPrompt('Explain validation rules')}
              className="px-2 py-1 rounded bg-white border border-slate-200 text-[10px] font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-900 hover:border-blue-200 transition"
            >
              Validation Rules
            </button>
          </div>

          {/* Input box */}
          <div className="p-2 border-t border-slate-200 bg-white flex items-center space-x-1">
            <input
              type="text"
              placeholder="Ask about this property..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && input.trim() && handleSendPrompt(input.trim())}
              className="flex-1 text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
            <button
              onClick={() => input.trim() && handleSendPrompt(input.trim())}
              className="p-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center space-x-2 px-4 py-2.5 bg-blue-900 text-white rounded-full shadow-lg hover:bg-blue-800 hover:shadow-xl transition-all"
        >
          <Sparkles className="w-4 h-4 text-blue-300" />
          <span className="text-xs font-bold">Guided Assistant</span>
        </button>
      )}
    </div>
  );
};

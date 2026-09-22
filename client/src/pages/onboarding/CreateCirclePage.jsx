import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCareCircle } from '../../hooks/useCareCircle';
import { useToast } from '../../hooks/useToast';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Icon } from '../../components/ui/Icon';

export function CreateCirclePage() {
  const navigate = useNavigate();
  const { createCircle } = useCareCircle();
  const toast = useToast();

  const [formData, setFormData] = useState({
    circleName: '',
    fullName: '',
    dateOfBirth: '',
    gender: 'prefer_not_to_say',
    bloodGroup: 'unknown',
    knownConditions: '',
    allergies: '',
    emergencyName: '',
    emergencyRelationship: '',
    emergencyPhone: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    if (errorMessage) setErrorMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const cleanFullName = formData.fullName.trim();
    if (!cleanFullName) {
      setErrorMessage('Please enter the name of the person receiving care.');
      return;
    }

    if (cleanFullName.length < 2 || cleanFullName.length > 100) {
      setErrorMessage('Care recipient full name must be between 2 and 100 characters.');
      return;
    }

    const cleanCircleName = formData.circleName.trim();
    if (cleanCircleName && (cleanCircleName.length < 2 || cleanCircleName.length > 100)) {
      setErrorMessage('Care Circle name must be between 2 and 100 characters.');
      return;
    }

    const circleName = cleanCircleName || `${cleanFullName}'s Care Circle`;

    const emergencyName = formData.emergencyName.trim();
    const emergencyRelationship = formData.emergencyRelationship.trim();
    const emergencyPhone = formData.emergencyPhone.trim();

    const emergencyContact =
      emergencyName || emergencyRelationship || emergencyPhone
        ? {
            name: emergencyName || null,
            relationship: emergencyRelationship || null,
            phone: emergencyPhone || null,
          }
        : undefined;

    setIsLoading(true);
    setErrorMessage('');

    try {
      const recipientPayload = {
        fullName: cleanFullName,
        dateOfBirth: formData.dateOfBirth || null,
        gender: formData.gender,
        bloodGroup: formData.bloodGroup,
        knownConditions: formData.knownConditions
          ? formData.knownConditions.split(',').map((c) => c.trim()).filter(Boolean)
          : [],
        allergies: formData.allergies
          ? formData.allergies.split(',').map((a) => a.trim()).filter(Boolean)
          : [],
        emergencyContact,
      };

      await createCircle({
        name: circleName,
        recipient: recipientPayload,
      });

      toast.success('Care Circle created! Welcome to your dashboard.');
      navigate('/dashboard');
    } catch (err) {
      setErrorMessage(err.message || 'Failed to create care circle.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="text-center mb-8">
        <div className="w-12 h-12 rounded-2xl bg-primary-container text-on-primary-container flex items-center justify-center mx-auto mb-3 shadow-sm">
          <Icon name="favorite" size={26} />
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-on-surface tracking-tight">
          Set Up Your Care Circle
        </h1>
        <p className="text-xs sm:text-sm text-on-surface-variant max-w-lg mx-auto mt-2 leading-relaxed">
          Tell us about the loved one you are caring for. You can invite family members, doctors, and nurses at any time.
        </p>
      </div>

      <Card variant="lowest" padding="lg" className="shadow-lg">
        {errorMessage && (
          <div className="mb-6 p-3.5 rounded-xl bg-error-container text-on-error-container text-xs font-semibold flex items-center gap-2 border border-error/20">
            <Icon name="error" size={18} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Care Recipient Info */}
          <div>
            <h2 className="font-serif text-xl font-bold text-on-surface pb-3 border-b border-outline-variant/30 flex items-center gap-2">
              <Icon name="person" size={20} className="text-primary" />
              <span>Care Recipient Profile</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div className="sm:col-span-2">
                <Input
                  label="Full Name / Preferred Name"
                  name="fullName"
                  placeholder="e.g. Papa, Grandma Sarah, David Miller"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                  autoFocus
                />
              </div>

              <Input
                label="Date of Birth"
                type="date"
                name="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleChange}
              />

              <Select
                label="Gender"
                name="gender"
                value={formData.gender}
                onChange={handleChange}
              >
                <option value="prefer_not_to_say">Prefer not to say</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </Select>

              <Select
                label="Blood Group"
                name="bloodGroup"
                value={formData.bloodGroup}
                onChange={handleChange}
              >
                <option value="unknown">Unknown</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </Select>

              <Input
                label="Care Circle Name (Optional)"
                name="circleName"
                placeholder={formData.fullName ? `${formData.fullName}'s Care Circle` : "e.g. Papa's Family Circle"}
                value={formData.circleName}
                onChange={handleChange}
              />

              <div className="sm:col-span-2">
                <Input
                  label="Known Conditions (comma separated)"
                  name="knownConditions"
                  placeholder="e.g. Hypertension, Type 2 Diabetes, Arthritis"
                  value={formData.knownConditions}
                  onChange={handleChange}
                />
              </div>

              <div className="sm:col-span-2">
                <Input
                  label="Allergies (comma separated)"
                  name="allergies"
                  placeholder="e.g. Penicillin, Peanuts, Sulfa"
                  value={formData.allergies}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Emergency Contact */}
          <div className="pt-2">
            <h2 className="font-serif text-xl font-bold text-on-surface pb-3 border-b border-outline-variant/30 flex items-center gap-2">
              <Icon name="emergency" size={20} className="text-error" />
              <span>Primary Emergency Contact</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
              <Input
                label="Contact Name"
                name="emergencyName"
                placeholder="e.g. Priya Sharma"
                value={formData.emergencyName}
                onChange={handleChange}
              />

              <Input
                label="Relationship"
                name="emergencyRelationship"
                placeholder="e.g. Daughter, Neighbor"
                value={formData.emergencyRelationship}
                onChange={handleChange}
              />

              <Input
                label="Phone Number"
                type="tel"
                name="emergencyPhone"
                placeholder="e.g. +91 98765 43210"
                value={formData.emergencyPhone}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Submit Actions */}
          <div className="pt-4 border-t border-outline-variant/30 flex flex-col sm:flex-row items-center justify-end gap-3">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              className="w-full sm:w-auto text-base font-bold shadow-md px-8"
            >
              Create Care Circle & Start Dashboard
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

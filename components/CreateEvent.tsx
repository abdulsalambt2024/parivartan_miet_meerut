import React, { useState, useEffect } from 'react';
import type { Event } from '../types';

interface CreateEventProps {
  onClose: () => void;
  onSaveEvent: (event: Omit<Event, 'id'> | Event) => void;
  eventToEdit?: Event | null;
}

const CreateEvent: React.FC<CreateEventProps> = ({ onClose, onSaveEvent, eventToEdit }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [registrationLink, setRegistrationLink] = useState('');
  const [image, setImage] = useState<string | null>(null);

  const isEditing = !!eventToEdit;

  useEffect(() => {
    if (isEditing) {
      setTitle(eventToEdit.title);
      setDescription(eventToEdit.description);
      // Format date for datetime-local input, adjusting for timezone
      const localDate = new Date(eventToEdit.date);
      localDate.setMinutes(localDate.getMinutes() - localDate.getTimezoneOffset());
      setDate(localDate.toISOString().slice(0, 16));
      setRegistrationLink(eventToEdit.registrationLink);
      setImage(eventToEdit.imageUrl || null);
    }
  }, [eventToEdit, isEditing]);


  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !date || !registrationLink.trim()) {
        alert("Please fill out all required fields.");
        return;
    };
    
    const eventData = {
      title,
      description,
      date: new Date(date),
      registrationLink,
      imageUrl: image || undefined,
    };

    if (isEditing) {
        onSaveEvent({ ...eventToEdit, ...eventData });
    } else {
        onSaveEvent(eventData);
    }
    
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl transform transition-all" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-dark">{isEditing ? 'Edit Event' : 'Create New Event'}</h2>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            <input
              type="text"
              placeholder="Event Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition"
              required
            />
            <textarea
              className="w-full h-24 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition"
              placeholder="Event Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            ></textarea>
            <input
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition"
              required
            />
            <input
              type="url"
              placeholder="Google Form Registration Link"
              value={registrationLink}
              onChange={(e) => setRegistrationLink(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition"
              required
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Upload Image (Optional)</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
              />
            </div>
            {image && <img src={image} alt="Preview" className="mt-4 rounded-lg max-h-48 w-auto object-cover" />}
          </div>
          <div className="p-6 bg-gray-50 rounded-b-2xl flex justify-end space-x-3">
            <button type="button" onClick={onClose} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 transition">Cancel</button>
            <button type="submit" className="px-6 py-2 bg-secondary text-dark rounded-lg font-bold hover:opacity-90 transition">{isEditing ? 'Save Changes' : 'Create Event'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateEvent;

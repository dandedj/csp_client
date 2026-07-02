import { render, screen } from '@testing-library/react';
import PlaqueCard from '../PlaqueCard';

// Smoke test: render the card with a minimal plaque and confirm the core
// text content and image render without crashing.
test('renders the plaque text and image', () => {
  const plaque = {
    id: 'abc',
    text: 'In loving memory of a survivor',
    photo: { url: 'https://example.com/plaque.jpg' }
  };

  render(<PlaqueCard plaque={plaque} />);

  expect(screen.getByText('Plaque Text')).toBeInTheDocument();
  expect(screen.getByText('In loving memory of a survivor')).toBeInTheDocument();
  expect(screen.getByRole('img')).toBeInTheDocument();
});

test('falls back to a default message when no text is present', () => {
  const plaque = {
    id: 'def',
    photo: { url: 'https://example.com/plaque.jpg' }
  };

  render(<PlaqueCard plaque={plaque} />);

  expect(screen.getByText('No text available')).toBeInTheDocument();
});

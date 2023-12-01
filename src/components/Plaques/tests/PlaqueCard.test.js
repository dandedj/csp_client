import { render, screen } from '@testing-library/react';
import PlaqueCard from '../PlaqueCard';

test('renders plaque information', () => {
  const plaque = {
    id: "abc",
    latitude: 123.456,
    longitude: 789.012,
    bearing: 90,
    donated_by: 'John Doe',
    image_url: 'https://example.com/image.jpg',
    text: ['Text 1', 'Text 2']
  };

  render(<PlaqueCard plaque={plaque} />);

  // Check if plaque information is rendered correctly
  expect(screen.getByText(/Plaque Information/i)).toBeInTheDocument();
  expect(screen.getByText(/Id:/i)).toBeInTheDocument();
  expect(screen.getByText(/Location:/i)).toBeInTheDocument();
  expect(screen.getByText(/Donated by:/i)).toBeInTheDocument();
  expect(screen.getByAltText('')).toBeInTheDocument();
  expect(screen.getByText(/Text 1/i)).toBeInTheDocument();
  expect(screen.getByText(/Text 2/i)).toBeInTheDocument();
});

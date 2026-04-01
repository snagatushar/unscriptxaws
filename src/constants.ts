import { Event, Faculty } from './types';

export const EVENTS: Event[] = [
  {
    id: 'battle-of-bands',
    title: 'Battle of Bands',
    category: 'Music',
    description: 'The ultimate showdown of musical talent.',
    longDescription: 'Get ready to witness the most electric musical competition of the year. Bands from across the country compete for the title of the ultimate rockstars.',
    date: 'April 15, 2026',
    time: '4:00 PM',
    venue: 'Main Auditorium',
    image: 'https://picsum.photos/seed/music/800/600',
    rules: [
      'Maximum 8 members per band.',
      'Time limit: 15 minutes including setup.',
      'No pre-recorded tracks allowed.',
      'Decision of judges is final.'
    ],
    prizes: ['Winner: ₹50,000', 'Runner Up: ₹25,000'],
    coordinators: [{ name: 'Alex Johnson', contact: '+91 98765 43210' }]
  },
  {
    id: 'rhythm-rush',
    title: 'Rhythm Rush',
    category: 'Dance',
    description: 'Express yourself through the language of movement.',
    longDescription: 'A high-energy dance competition featuring solo and group performances in various styles from classical to hip-hop.',
    date: 'April 16, 2026',
    time: '2:00 PM',
    venue: 'Open Air Theater',
    image: 'https://picsum.photos/seed/dance/800/600',
    rules: [
      'Solo: 3-5 mins, Group: 5-8 mins.',
      'Props are allowed but must be cleared immediately.',
      'Music must be submitted 2 hours prior.'
    ],
    prizes: ['Winner: ₹30,000', 'Runner Up: ₹15,000'],
    coordinators: [{ name: 'Sarah Miller', contact: '+91 87654 32109' }]
  },
  {
    id: 'code-chaos',
    title: 'Code Chaos',
    category: 'Tech',
    description: '24-hour hackathon to solve real-world problems.',
    longDescription: 'Bring your laptops and your best ideas. Build something amazing in 24 hours and win big.',
    date: 'April 15-16, 2026',
    time: '10:00 AM onwards',
    venue: 'IT Block Lab 1',
    image: 'https://picsum.photos/seed/tech/800/600',
    rules: [
      'Team size: 2-4 members.',
      'Original work only.',
      'API keys and resources will be provided.'
    ],
    prizes: ['Winner: ₹1,00,000', 'Internship opportunities'],
    coordinators: [{ name: 'David Chen', contact: '+91 76543 21098' }]
  },
  {
    id: 'pixel-perfect',
    title: 'Pixel Perfect',
    category: 'Art',
    description: 'Digital art competition for the creative minds.',
    longDescription: 'Showcase your digital painting and design skills. Theme will be revealed on the spot.',
    date: 'April 17, 2026',
    time: '11:00 AM',
    venue: 'Design Studio',
    image: 'https://picsum.photos/seed/art/800/600',
    rules: [
      'Bring your own tablets/laptops.',
      'Software of choice is allowed.',
      '3 hours time limit.'
    ],
    prizes: ['Winner: ₹20,000', 'Creative Cloud Subscription'],
    coordinators: [{ name: 'Elena Rodriguez', contact: '+91 65432 10987' }]
  }
];

export const FACULTY: Faculty[] = [
  {
    name: 'Dr. Robert Wilson',
    designation: 'Head of Cultural Committee',
    image: 'https://picsum.photos/seed/faculty1/400/400',
    department: 'Department of Arts'
  },
  {
    name: 'Prof. Amanda Smith',
    designation: 'Event Coordinator',
    image: 'https://picsum.photos/seed/faculty2/400/400',
    department: 'Department of Music'
  },
  {
    name: 'Dr. James Carter',
    designation: 'Technical Advisor',
    image: 'https://picsum.photos/seed/faculty3/400/400',
    department: 'Department of Computer Science'
  }
];

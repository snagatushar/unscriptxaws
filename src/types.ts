export interface Event {
  id: string;
  title: string;
  category: 'Music' | 'Dance' | 'Drama' | 'Art' | 'Tech' | 'Gaming';
  description: string;
  longDescription: string;
  date: string;
  time: string;
  venue: string;
  image: string;
  rules: string[];
  prizes: string[];
  coordinators: { name: string; contact: string }[];
}

export interface Faculty {
  name: string;
  designation: string;
  image: string;
  department: string;
}

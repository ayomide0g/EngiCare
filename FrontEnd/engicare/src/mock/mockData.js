// Initial Mock Users
export const mockCurrentUser = {
  id: "USR-001",
  name: "Alex Morgan",
  email: "alex.morgan@university.edu",
  role: "student", // "student" | "admin" | "staff"
  department: "Computer Engineering",
  studentId: "65010482"
};

// Report Issue Categories
export const CATEGORIES = [
  "Equipment",
  "Classroom",
  "Maintenance",
  "Electrical",
  "Plumbing",
  "Internet",
  "Other"
];

// University Campus Locations
export const LOCATIONS = [
  "Engineering Building A - Room 201",
  "Engineering Building B - Lab 402",
  "Main Library - 2nd Floor Study Area",
  "Faculty Canteen",
  "Student Center - Hallway 1B",
  "Science Complex - Auditorium",
  "Campus Quad - Outdoor Area"
];

// Initial Mock Reports List
const rawReports = [
  {
    id: "ENG-2026-001",
    title: "Broken Projector in Room 201",
    category: "Equipment",
    location: "Engineering Building A - Room 201",
    description: "The ceiling-mounted projector continuously turns off after 5 minutes of usage and flashes a red lamp warning indicator.",
    status: "In Progress",
    createdAt: "2026-10-02T09:30:00Z",
    updatedAt: "2026-10-04T14:15:00Z",
    reporter: {
      name: "Alex Morgan",
      email: "alex.morgan@university.edu",
      role: "Student"
    },
    adminNotes: "Technician dispatched on Oct 4 to replace the cooling fan unit.",
    timeline: [
      {
        status: "Submitted",
        timestamp: "2026-10-02T09:30:00Z",
        comment: "Report created by student."
      },
      {
        status: "Under Review",
        timestamp: "2026-10-03T11:00:00Z",
        comment: "Assigned to Audio-Visual Maintenance Team."
      },
      {
        status: "In Progress",
        timestamp: "2026-10-04T14:15:00Z",
        comment: "Replacement part ordered. Repair ongoing."
      }
    ]
  },
  {
    id: "ENG-2026-002",
    title: "Water Leak near Restroom 2nd Floor",
    category: "Plumbing",
    location: "Main Library - 2nd Floor Study Area",
    description: "Water is constantly leaking from the pipe joint under the sink, pooling into the hallway floor.",
    status: "Under Review",
    createdAt: "2026-10-05T10:15:00Z",
    updatedAt: "2026-10-05T12:00:00Z",
    reporter: {
      name: "Jordan Lee",
      email: "jordan.lee@university.edu",
      role: "Faculty Staff"
    },
    adminNotes: "Facilities management notified for immediate inspection.",
    timeline: [
      {
        status: "Submitted",
        timestamp: "2026-10-05T10:15:00Z",
        comment: "Report created."
      },
      {
        status: "Under Review",
        timestamp: "2026-10-05T12:00:00Z",
        comment: "Facilities manager reviewing issue priority."
      }
    ]
  },
  {
    id: "ENG-2026-003",
    title: "Wi-Fi Disconnections in Lab 402",
    category: "Internet",
    location: "Engineering Building B - Lab 402",
    description: "The Wi-Fi access point continuously drops connection every 10 minutes for all desktop nodes during lab sessions.",
    status: "Resolved",
    createdAt: "2026-09-28T08:00:00Z",
    updatedAt: "2026-09-30T16:45:00Z",
    reporter: {
      name: "Alex Morgan",
      email: "alex.morgan@university.edu",
      role: "Student"
    },
    adminNotes: "Replaced faulty network switch and updated router firmware.",
    timeline: [
      {
        status: "Submitted",
        timestamp: "2026-09-28T08:00:00Z",
        comment: "Report submitted."
      },
      {
        status: "Under Review",
        timestamp: "2026-09-28T10:30:00Z",
        comment: "Assigned to Campus Network Ops."
      },
      {
        status: "In Progress",
        timestamp: "2026-09-29T09:00:00Z",
        comment: "Testing router throughput and switch hardware."
      },
      {
        status: "Resolved",
        timestamp: "2026-09-30T16:45:00Z",
        comment: "Issue resolved and verified."
      }
    ]
  },
  {
    id: "ENG-2026-004",
    title: "Flickering Overhead Light in Canteen",
    category: "Electrical",
    location: "Faculty Canteen",
    description: "Main LED panel above seating area 4 flickers constantly causing eye strain.",
    status: "Submitted",
    createdAt: "2026-10-06T08:20:00Z",
    updatedAt: "2026-10-06T08:20:00Z",
    reporter: {
      name: "Taylor Smith",
      email: "taylor.smith@university.edu",
      role: "Student"
    },
    adminNotes: "",
    timeline: [
      {
        status: "Submitted",
        timestamp: "2026-10-06T08:20:00Z",
        comment: "Report submitted by user."
      }
    ]
  },
  {
    id: "ENG-2026-005",
    title: "Air Conditioner Making Loud Noise",
    category: "Classroom",
    location: "Science Complex - Auditorium",
    description: "The central air conditioning system produces a screeching noise during lectures.",
    status: "Rejected",
    createdAt: "2026-09-20T14:10:00Z",
    updatedAt: "2026-09-21T09:00:00Z",
    reporter: {
      name: "Alex Morgan",
      email: "alex.morgan@university.edu",
      role: "Student"
    },
    adminNotes: "Duplicate report. Issue was already addressed under ticket ENG-2026-000.",
    timeline: [
      {
        status: "Submitted",
        timestamp: "2026-09-20T14:10:00Z",
        comment: "Report submitted."
      },
      {
        status: "Rejected",
        timestamp: "2026-09-21T09:00:00Z",
        comment: "Marked as duplicate report."
      }
    ]
  }
];
// Pages read submittedBy / priority / comments, so derive them here.
const priorities = { "ENG-2026-001": "High", "ENG-2026-002": "Critical", "ENG-2026-003": "Medium", "ENG-2026-004": "Low", "ENG-2026-005": "Low" };
export const mockReports = rawReports.map((r) => ({
  ...r,
  submittedBy: r.reporter.name,
  priority: priorities[r.id] || "Medium",
  comments: r.adminNotes
    ? [{ id: `${r.id}-n`, author: "Facilities Team", role: "Facilities Admin", createdAt: r.updatedAt, text: r.adminNotes }]
    : [],
}));

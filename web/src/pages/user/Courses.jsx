import React, { useEffect, useState } from "react";
import CourseCard from "../../components/CourseCard";

import { GiMeditation } from "react-icons/gi";
import { FaBrain, FaHeart, FaBed, FaHandsHelping } from "react-icons/fa";
import { MdHealthAndSafety } from "react-icons/md";
import { BsEmojiFrown } from "react-icons/bs";
import { MdAllInclusive } from "react-icons/md";
import { FaLeaf } from "react-icons/fa";

const API_URL = "http://localhost:7001";

export default function Courses() {

  const [courses, setCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [search, setSearch] = useState("");

  /* -------- FETCH COURSES -------- */

  useEffect(() => {

    fetch(`${API_URL}/api/courses`)
      .then(res => res.json())
      .then(data => {
        setCourses(data);
        setFilteredCourses(data);
      })
      .catch(err => console.error("Error loading courses", err));

  }, []);

  /* -------- FILTER COURSES -------- */

  useEffect(() => {

    let result = courses;

    if (selectedCategory !== "All") {
      result = result.filter(
        (course) => course.category === selectedCategory
      );
    }

    if (search) {
      result = result.filter((course) =>
        course.title.toLowerCase().includes(search.toLowerCase())
      );
    }

    setFilteredCourses(result);

  }, [selectedCategory, search, courses]);

  /* -------- CATEGORIES -------- */

  const categories = [

    { name: "All", icon: <MdAllInclusive /> },

    { name: "Mindfulness", icon: <FaBrain /> },

    { name: "Stress", icon: <BsEmojiFrown /> },

    { name: "Anxiety", icon: <FaBrain /> },

    { name: "Healthcare", icon: <MdHealthAndSafety /> },

    { name: "Sleep", icon: <FaBed /> },

    { name: "Relationships", icon: <FaHeart /> },

    { name: "Self-Care", icon: <FaLeaf /> },

    { name: "Meditation", icon: <GiMeditation /> },

    { name: "Emotional Regulation", icon: <FaHandsHelping /> },


  ];

  return (

    <div className="p-6 space-y-10">

      {/* -------- HERO SECTION -------- */}

<div
  className="
  bg-gradient-to-b
  from-purple-200
  via-green-600
  to-blue-300
  rounded-3xl
  p-16
  text-center
  shadow-xl
  "
>
  

  <h1 className="text-4xl font-semibold text-gray-800">
    Improve Your Emotional Intelligence
  </h1>

  <p className="mt-4 text-gray-700 max-w-xl mx-auto">
    Learn mindfulness, manage stress, improve relationships,
    and develop emotional balance with our guided courses.
  </p>
        {/* SEARCH */}

        <input
          type="text"
          placeholder="Search emotional intelligence courses..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="
          mt-6
          w-full
          md:w-96
          p-3
          rounded-xl
          text-black
          outline-none
          shadow-lg
          "
        />

      </div>

      {/* -------- CATEGORY FILTER -------- */}

      <div className="flex flex-wrap gap-4">

        {categories.map((cat) => (

          <button
            key={cat.name}
            onClick={() => setSelectedCategory(cat.name)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl shadow transition
              ${
                selectedCategory === cat.name
                  ? "bg-green-600 text-white"
                  : "bg-white hover:bg-gray-100"
              }
            `}
          >

            {cat.icon}

            {cat.name}

          </button>

        ))}

      </div>

      {/* -------- COURSE GRID -------- */}

      <div>

        <h2 className="text-xl font-semibold mb-4">
           Courses
        </h2>

        {filteredCourses.length === 0 ? (

          <div className="text-gray-500">
            No courses found.
          </div>

        ) : (

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">

            {filteredCourses.map((course) => (

              <CourseCard
                key={course._id}
                course={course}
              />

            ))}

          </div>

        )}

      </div>

      {/* -------- CONTINUE LEARNING -------- */}

      {courses.length > 0 && (

        <div>

          <h2 className="text-xl font-semibold mb-4">
            Continue Learning
          </h2>

          <div className="flex gap-6 overflow-x-auto pb-4">

            {courses.slice(0, 6).map((course) => (

              <CourseCard
                key={course._id}
                course={course}
                horizontal
              />

            ))}

          </div>

        </div>

      )}

    </div>

  );

}
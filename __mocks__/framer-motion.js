/**
 * Mock for framer-motion in Jest tests
 */

const React = require('react');

// Create a mock motion component that renders as a regular HTML element
const createMotionComponent = (element) => {
  return React.forwardRef(({ children, initial, animate, exit, variants, transition, whileHover, whileTap, whileInView, viewport, layout, layoutId, drag, dragConstraints, onDragEnd, ...props }, ref) => {
    return React.createElement(element, { ref, ...props }, children);
  });
};

const motion = {
  div: createMotionComponent('div'),
  span: createMotionComponent('span'),
  p: createMotionComponent('p'),
  a: createMotionComponent('a'),
  button: createMotionComponent('button'),
  ul: createMotionComponent('ul'),
  li: createMotionComponent('li'),
  img: createMotionComponent('img'),
  section: createMotionComponent('section'),
  article: createMotionComponent('article'),
  header: createMotionComponent('header'),
  footer: createMotionComponent('footer'),
  nav: createMotionComponent('nav'),
  main: createMotionComponent('main'),
  aside: createMotionComponent('aside'),
  form: createMotionComponent('form'),
  input: createMotionComponent('input'),
  textarea: createMotionComponent('textarea'),
  select: createMotionComponent('select'),
  label: createMotionComponent('label'),
  h1: createMotionComponent('h1'),
  h2: createMotionComponent('h2'),
  h3: createMotionComponent('h3'),
  h4: createMotionComponent('h4'),
  h5: createMotionComponent('h5'),
  h6: createMotionComponent('h6'),
  svg: createMotionComponent('svg'),
  path: createMotionComponent('path'),
  circle: createMotionComponent('circle'),
  rect: createMotionComponent('rect'),
  line: createMotionComponent('line'),
  polyline: createMotionComponent('polyline'),
  polygon: createMotionComponent('polygon'),
  g: createMotionComponent('g'),
};

// AnimatePresence just renders children
const AnimatePresence = ({ children, mode, initial, onExitComplete }) => {
  return React.createElement(React.Fragment, null, children);
};

// useAnimation hook mock
const useAnimation = () => ({
  start: jest.fn(),
  stop: jest.fn(),
  set: jest.fn(),
});

// useInView hook mock
const useInView = () => [null, true];

// useScroll hook mock
const useScroll = () => ({
  scrollX: { get: () => 0 },
  scrollY: { get: () => 0 },
  scrollXProgress: { get: () => 0 },
  scrollYProgress: { get: () => 0 },
});

// useTransform hook mock
const useTransform = (value, inputRange, outputRange) => ({
  get: () => outputRange?.[0] ?? 0,
});

// useSpring hook mock
const useSpring = (value) => ({
  get: () => (typeof value === 'number' ? value : 0),
});

// useMotionValue hook mock
const useMotionValue = (initial) => ({
  get: () => initial,
  set: jest.fn(),
  onChange: jest.fn(),
});

// useReducedMotion hook mock
const useReducedMotion = () => false;

// useDragControls hook mock
const useDragControls = () => ({
  start: jest.fn(),
});

// useAnimationControls hook mock
const useAnimationControls = () => ({
  start: jest.fn().mockResolvedValue(undefined),
  stop: jest.fn(),
  set: jest.fn(),
});

module.exports = {
  motion,
  AnimatePresence,
  useAnimation,
  useInView,
  useScroll,
  useTransform,
  useSpring,
  useMotionValue,
  useReducedMotion,
  useDragControls,
  useAnimationControls,
};

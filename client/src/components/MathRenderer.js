import { MathJax, MathJaxContext } from "better-react-mathjax";

const MathRenderer = ({ content }) => {
  return (
    <MathJaxContext>
      <MathJax dynamic>
        {content}
      </MathJax>
    </MathJaxContext>
  );
};

export default MathRenderer;

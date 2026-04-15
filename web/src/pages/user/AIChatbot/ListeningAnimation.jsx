
const ListeningAnimation = () => {
    return (
        <div className="absolute inset-0 flex items-center pl-14 pointer-events-none overflow-hidden rounded-2xl">
            <div className="flex items-center">
                <span className="text-gray-400 text-sm font-medium">
                    Your AI assistant is listening
                    <span className="inline-block w-6 text-left ml-0.5">
                        <span className="animate-dot-bounce inline-block">.</span>
                        <span className="animate-dot-bounce inline-block" style={{ animationDelay: "0.2s" }}>.</span>
                        <span className="animate-dot-bounce inline-block" style={{ animationDelay: "0.4s" }}>.</span>
                    </span>
                </span>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
        @keyframes dot-bounce {
          0%, 100% { transform: translateY(0); opacity: 0.3; }
          50% { transform: translateY(-2px); opacity: 1; }
        }
        .animate-dot-bounce {
          animation: dot-bounce 1.4s ease-in-out infinite;
        }
      `}} />
        </div>
    );
};

export default ListeningAnimation;

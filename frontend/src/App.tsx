import React, {useState} from 'react';
import './App.css';
import {fetchEventSource} from "@microsoft/fetch-event-source";

interface Message {
  message: string;
  isUser: boolean;
  sources?: string[];
}

function App() {
  const [inputValue, setInputValue] = useState("")
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);

  const setPartialMessage = (chunk: string, sources: string[] = []) => {
    setMessages(prevMessages => {
      let lastMessage = prevMessages[prevMessages.length - 1];
      if (prevMessages.length === 0 || !lastMessage.isUser) {
        return [...prevMessages.slice(0, -1), {
          message: lastMessage.message + chunk,
          isUser: false,
          sources: lastMessage.sources ? [...lastMessage.sources, ...sources] : sources
        }];
      }

      return [...prevMessages, {message: chunk, isUser: false, sources}];
    })
  }

  function handleReceiveMessage(data: string) {
    let parsedData = JSON.parse(data);

    if (parsedData.answer) {
      setPartialMessage(parsedData.answer.content)
    }

    if (parsedData.docs) {
      setPartialMessage("", parsedData.docs.map((doc: any) => doc.metadata.source))
    }
  }

  const handleSendMessage = async (message: string) => {
    setInputValue("")

    setMessages(prevMessages => [...prevMessages, {message, isUser: true}]);

    await fetchEventSource(`http://localhost:8000/rag/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: {
          question: message,
        }
      }),
      onmessage(event) {
        if (event.event === "data") {
          handleReceiveMessage(event.data);
        }
      },
    })
  }

  const handleKeyPress = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      handleSendMessage(inputValue.trim())
    }
  }

  function formatSource(source: string) {
    return source.split("/").pop() || "";
  }

  const handleUploadFiles = async () => {
    if (!selectedFiles) {
      return;
    }
  
    const formData = new FormData();
    Array.from(selectedFiles).forEach((file: Blob) => {
      formData.append('files', file);
    });
  
    // Example: Sending files to a backend endpoint
    try {
      const response = await fetch('http://localhost:8000/upload', {
        method: 'POST',
        body: formData, // No headers for multipart/form-data; fetch adds it automatically
      });
      
      if (response.ok) {
        console.log('Upload successful');
      } else {
        console.error('Upload failed');
      }
    } catch (error) {
      console.error('Error uploading files:', error);
    }
  };

  const loadAndProcessPDFs = async () => {
    try {
      const response = await fetch('http://localhost:8000/load-and-process-pdfs', {
        method: 'POST',
      });
      if (response.ok) {
        console.log('PDFs loaded and processed successfully');
      } else {
        console.error('Failed to load and process PDFs');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="bg-blue-100 text-gray-800 text-center p-4 shadow-sm">
        A Basic CHAT WITH YOUR PRIVATE PDFS Rag LLM App
      </header>
      <main className="flex-grow container mx-auto p-4 flex-col">
        <div className="flex-grow bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="border-b border-gray-200 p-4">
            {messages.map((msg, index) => (
              <div key={index}
                  className={`p-3 my-3 rounded-lg text-gray-800 ml-auto ${msg.isUser ? "bg-blue-50" : "bg-gray-50"}`}>
                {msg.message}
                {/* Source */}
                {!msg.isUser && (
                  <div className={"text-xs"}>
                    <hr className="border-b mt-5 mb-5 border-gray-200"></hr>
                    {msg.sources?.map((source, index) => (
                      <div key={index}>
                        <a
                          target="_blank"
                          download
                          href={`${"http://localhost:8000"}/rag/static/${encodeURI(formatSource(source))}`}
                          rel="noreferrer"
                          className="text-blue-600 hover:text-blue-800"
                        >{formatSource(source)}</a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="p-4 bg-gray-50">
            <textarea
              className="form-textarea w-full p-2 border rounded text-gray-800 bg-white border-gray-300 resize-none h-auto"
              placeholder="Enter your message here..."
              onKeyUp={handleKeyPress}
              onChange={(e) => setInputValue(e.target.value)}
              value={inputValue}
            ></textarea>
            <button
              className="mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              onClick={() => handleSendMessage(inputValue.trim())}
            >
              Send
            </button>
            {/* Reordered elements */}
            <div className="mt-2">
              <input 
                type="file" 
                accept=".pdf" 
                multiple 
                onChange={(e) => setSelectedFiles(e.target.files)} 
              />
              <button
                className="mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded block"
                onClick={handleUploadFiles}
              >
                Upload PDFs
              </button>
              <button
                className="mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                onClick={loadAndProcessPDFs}
              >
                Load and Process PDFs
              </button>
            </div>
          </div>
        </div>
  
      </main>
      <footer className="bg-blue-100 text-gray-800 text-center p-4 text-xs border-t border-gray-200">
        Footer message: copyright, etc
      </footer>
  
    </div>
  );
  
}

export default App;

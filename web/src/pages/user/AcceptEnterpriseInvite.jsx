import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { acceptEnterpriseInvite } from "../../api/authApi";

const AcceptEnterpriseInvite = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("Accepting your invitation...");

  const token = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return String(params.get("token") || "").trim();
  }, [location.search]);

  useEffect(() => {
    const runAcceptFlow = async () => {
      if (!token) {
        setStatus("error");
        setMessage("Invite token is missing.");
        return;
      }

      try {
        const response = await acceptEnterpriseInvite(token);
        const user = response.data?.user;

        if (user) {
          localStorage.setItem("user", JSON.stringify(user));
        }

        setStatus("success");
        setMessage(response.data?.message || "Invitation accepted successfully.");

        setTimeout(() => {
          navigate("/dashboard", { replace: true });
        }, 1200);
      } catch (error) {
        if (error.response?.status === 401) {
          setStatus("error");
          setMessage("Please log in with the invited account to accept this invitation.");
          return;
        }

        setStatus("error");
        setMessage(
          error.response?.data?.message ||
            "Failed to accept invitation. Please try again."
        );
      }
    };

    runAcceptFlow();
  }, [navigate, token]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">
          Enterprise Invitation
        </h1>
        <p className="mt-4 text-sm text-slate-600">{message}</p>

        {status === "loading" && (
          <div className="mt-6 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-indigo-600" />
          </div>
        )}

        {status === "error" && (
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={() => {
                if (token) {
                  localStorage.setItem("pendingEnterpriseInviteToken", token);
                }
                navigate("/login", { replace: true });
              }}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => navigate("/dashboard", { replace: true })}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Go To Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AcceptEnterpriseInvite;
